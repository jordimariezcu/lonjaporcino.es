#!/usr/bin/env python3
"""
Extrae precios del boletín PDF semanal de Mercolleida.

Uso:
  python scripts/extraer-mercolleida.py                  # descarga automáticamente
  python scripts/extraer-mercolleida.py ruta/al/boletin.pdf  # usa PDF local
  python scripts/extraer-mercolleida.py --semana          # solo muestra fecha de sesión

Salida: JSON a stdout con los campos extraídos.
Errores: stderr + exit code 1.
"""

import sys
import re
import json
import os
import urllib.request
import urllib.parse
import tempfile
from datetime import date, timedelta

# ── Configuración ────────────────────────────────────────────────────────────

MERCOLLEIDA_HOME = "https://www.mercolleida.com/es"
PDF_URL_PATTERN = re.compile(
    r'sites/default/files/\d{4}-\d{2}/[^"\']+\.pdf',
    re.IGNORECASE,
)

# ── Funciones auxiliares ─────────────────────────────────────────────────────

def log(msg):
    print(msg, file=sys.stderr)


def numero_de_coma(s):
    """Convierte '1,012' o '1.012' a float."""
    if not s:
        return None
    s = s.strip().replace('(R)', '').strip()
    # Si tiene coma, puede ser decimal europeo (1,012) o separador de miles
    # En el contexto del boletín, los precios tienen formato '1,012' = 1.012 decimal
    return float(s.replace(',', '.'))


def formatear(n, decimales=3):
    """Convierte float a string con decimales fijos, sin ceros extra."""
    if n is None:
        return ''
    # Redondear a los decimales indicados
    s = f"{round(n, decimales):.{decimales}f}"
    # Quitar ceros finales pero dejar al menos 2 decimales
    s = s.rstrip('0').rstrip('.')
    if '.' not in s:
        s += '.00'
    elif len(s.split('.')[1]) < 2:
        s += '0'
    return s


def jueves_anterior():
    """Devuelve la fecha del último jueves (día de la sesión de Mercolleida)."""
    hoy = date.today()
    dias_atras = (hoy.weekday() - 3) % 7  # 3 = jueves
    if dias_atras == 0:
        dias_atras = 7  # si hoy es jueves, usar el anterior
    return hoy - timedelta(days=dias_atras)


# ── Descarga del PDF ─────────────────────────────────────────────────────────

def encontrar_url_pdf():
    """Busca la URL del último boletín en la página principal de Mercolleida."""
    log("Buscando último boletín en mercolleida.com...")
    req = urllib.request.Request(
        MERCOLLEIDA_HOME,
        headers={'User-Agent': 'Mozilla/5.0 (compatible; lonjaporcino-bot/1.0)'}
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            html = resp.read().decode('utf-8', errors='replace')
    except Exception as e:
        log(f"Error al acceder a mercolleida.com: {e}")
        return None

    matches = PDF_URL_PATTERN.findall(html)
    if not matches:
        log("No se encontró ningún enlace a PDF en la página principal.")
        return None

    # El primero suele ser el más reciente
    ruta = matches[0]
    url = f"https://www.mercolleida.com/{ruta}"
    log(f"PDF encontrado: {url}")
    return url


def descargar_pdf(url, destino):
    """Descarga el PDF en destino. Devuelve True si tiene éxito."""
    req = urllib.request.Request(
        url,
        headers={'User-Agent': 'Mozilla/5.0 (compatible; lonjaporcino-bot/1.0)'}
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = resp.read()
        if len(data) < 10000:
            log(f"Archivo descargado demasiado pequeño ({len(data)} bytes), probablemente un error.")
            return False
        with open(destino, 'wb') as f:
            f.write(data)
        log(f"PDF descargado: {len(data)/1024:.0f} KB → {destino}")
        return True
    except Exception as e:
        log(f"Error al descargar el PDF: {e}")
        return False


# ── Extracción de precios ────────────────────────────────────────────────────

def extraer_precios(ruta_pdf):
    """
    Extrae precios del boletín Mercolleida usando pdfplumber.
    Devuelve dict con los campos encontrados o {} si falla.
    """
    try:
        import pdfplumber
    except ImportError:
        log("Error: pdfplumber no está instalado. Ejecuta: pip install pdfplumber")
        sys.exit(1)

    resultado = {}
    numero_boletin = None
    fecha_sesion = None

    with pdfplumber.open(ruta_pdf) as pdf:
        log(f"PDF abierto: {len(pdf.pages)} páginas")

        texto_completo = ""
        for page in pdf.pages:
            t = page.extract_text() or ""
            texto_completo += t + "\n"

        # ── Número de boletín y fecha ────────────────────────────────────────
        # "Nº 2.917 / BOLETÍN MERCOLLEIDA Del 12 al 16 de enero de 2026"
        m = re.search(r'N[º°]\s*([\d.]+)\s*/\s*BOLET[ÍI]N MERCOLLEIDA\s+Del\s+(\d+)\s+al\s+(\d+)\s+de\s+(\w+)\s+de\s+(\d{4})', texto_completo)
        if m:
            numero_boletin = m.group(1).replace('.', '')
            dia_fin = int(m.group(3))
            mes_str = m.group(4).lower()
            anyo = int(m.group(5))
            meses = {
                'enero':1,'febrero':2,'marzo':3,'abril':4,'mayo':5,'junio':6,
                'julio':7,'agosto':8,'septiembre':9,'octubre':10,'noviembre':11,'diciembre':12,
                # Sin tildes (encoding issues)
                'enero':1,'febrero':2,'marzo':3,'abril':4,'mayo':5,'junio':6,
                'julio':7,'agosto':8,'septiembre':9,'octubre':10,'noviembre':11,'diciembre':12,
            }
            mes_num = meses.get(mes_str)
            if mes_num and anyo:
                fecha_sesion = f"{anyo}-{mes_num:02d}-{dia_fin:02d}"
                log(f"Boletín nº {numero_boletin}, sesión: {fecha_sesion}")

        # ── Tabla de precios porcino ─────────────────────────────────────────
        # Formato: "Cerdo selecto 1,012 1,012 0,000"
        # Columnas: categoría | semana anterior | semana actual | diferencia
        # Usamos el SEGUNDO valor numérico (semana actual)

        patrones_blanco = [
            ('blanco_selecto', r'Cerdo\s+selecto\s+([\d,]+)\s+([\d,]+)'),
            ('blanco_normal',  r'Cerdo\s+de\s+Lleida\s+o\s+normal\s+([\d,]+)\s+([\d,]+)'),
            ('blanco_graso',   r'Cerdo\s+graso\s+([\d,]+)\s+([\d,]+)'),
        ]

        for campo, patron in patrones_blanco:
            m = re.search(patron, texto_completo)
            if m:
                precio_actual = numero_de_coma(m.group(2))
                if precio_actual:
                    resultado[campo] = formatear(precio_actual)
                    log(f"  {campo}: {resultado[campo]} €/kg vivo")

        # Lechón base Lleida
        m = re.search(r'Precio\s+Base\s+Lleida\s+([\d,]+)(?:\s*\(R\))?\s+([\d,]+)', texto_completo)
        if m:
            precio = numero_de_coma(m.group(2))
            if precio:
                resultado['lechon_nacional'] = formatear(precio, 2)
                log(f"  lechon_nacional: {resultado['lechon_nacional']} €/ud base 20kg")

        # Cerda (desvieje aprox — puede estar en €/kg vivo en Mercolleida)
        # Búsqueda cuidadosa para evitar falsos positivos
        m = re.search(r'^Cerda\s+([\d,]+)\s+([\d,]+)', texto_completo, re.MULTILINE)
        if m:
            precio = numero_de_coma(m.group(2))
            if precio:
                resultado['cerda_vivo'] = formatear(precio)  # campo temporal, no en schema final
                log(f"  cerda (referencia): {resultado['cerda_vivo']} €/kg vivo")

    if not resultado:
        log("Advertencia: no se extrajo ningún precio. El formato del PDF puede haber cambiado.")

    if numero_boletin:
        resultado['_boletin'] = numero_boletin
    if fecha_sesion:
        resultado['_fecha'] = fecha_sesion

    return resultado


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    args = sys.argv[1:]
    solo_fecha = '--semana' in args
    args = [a for a in args if not a.startswith('--')]

    ruta_pdf_local = args[0] if args else None

    if solo_fecha:
        print(str(jueves_anterior()))
        return

    # Obtener PDF
    if ruta_pdf_local:
        if not os.path.exists(ruta_pdf_local):
            log(f"Archivo no encontrado: {ruta_pdf_local}")
            sys.exit(1)
        ruta_pdf = ruta_pdf_local
        tmp = None
    else:
        url = encontrar_url_pdf()
        if not url:
            log("No se pudo encontrar la URL del PDF.")
            sys.exit(1)

        tmp = tempfile.NamedTemporaryFile(suffix='.pdf', delete=False)
        tmp.close()
        ruta_pdf = tmp.name

        if not descargar_pdf(url, ruta_pdf):
            os.unlink(ruta_pdf)
            sys.exit(1)

    # Extraer precios
    try:
        datos = extraer_precios(ruta_pdf)
    finally:
        if tmp and os.path.exists(tmp.name):
            os.unlink(tmp.name)

    # Si no se extrajo la fecha del PDF, usar el último jueves
    if '_fecha' not in datos:
        datos['_fecha'] = str(jueves_anterior())
        log(f"Fecha de sesión estimada: {datos['_fecha']} (último jueves)")

    print(json.dumps(datos, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
