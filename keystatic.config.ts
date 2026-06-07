import { config, fields, collection, singleton } from '@keystatic/core';

const isProduction = process.env.NODE_ENV === 'production';

export default config({
  storage: isProduction
    ? {
        kind: 'github',
        repo: {
          owner: 'jordimariezcu',
          name: 'lonjaporcino.es',
        },
      }
    : { kind: 'local' },

  ui: {
    brand: { name: 'Lonja Porcino' },
    navigation: {
      Precios: ['sesiones'],
      Blog: ['posts'],
      Lonjas: ['lonjas'],
      Sitio: ['sobre'],
    },
  },

  collections: {
    sesiones: collection({
      label: 'Sesiones de precios',
      slugField: 'fecha',
      path: 'src/content/sesiones/*',
      format: { data: 'yaml' },
      schema: {
        fecha: fields.slug({ name: { label: 'Fecha (YYYY-MM-DD)' } }),
        fuente: fields.text({ label: 'Fuente', description: 'Ej: Mercolleida, Lonja de Salamanca' }),
        notas: fields.text({ label: 'Notas de mercado', multiline: true }),

        // ── Porcino Blanco (€/kg canal) ─────────────────────────────
        blanco_selecto_min: fields.text({ label: 'Blanco · Cerdo Selecto — Mín (€/kg canal)', description: 'Ej: 1.88' }),
        blanco_selecto_max: fields.text({ label: 'Blanco · Cerdo Selecto — Máx (€/kg canal)' }),
        blanco_normal_min:  fields.text({ label: 'Blanco · Cerdo Normal — Mín (€/kg canal)' }),
        blanco_normal_max:  fields.text({ label: 'Blanco · Cerdo Normal — Máx (€/kg canal)' }),
        blanco_graso_min:   fields.text({ label: 'Blanco · Cerdo Graso — Mín (€/kg canal)' }),
        blanco_graso_max:   fields.text({ label: 'Blanco · Cerdo Graso — Máx (€/kg canal)' }),

        // ── Lechones y Cochinillos ───────────────────────────────────
        lechon_nacional_min:     fields.text({ label: 'Lechones · Nacional — Mín (€/ud base 20kg)' }),
        lechon_nacional_max:     fields.text({ label: 'Lechones · Nacional — Máx (€/ud base 20kg)' }),
        lechon_importacion_min:  fields.text({ label: 'Lechones · Importación — Mín (€/ud)' }),
        lechon_importacion_max:  fields.text({ label: 'Lechones · Importación — Máx (€/ud)' }),
        cochinillo_marca_min:    fields.text({ label: 'Lechones · Cochinillo con marca — Mín (€/kg)' }),
        cochinillo_marca_max:    fields.text({ label: 'Lechones · Cochinillo con marca — Máx (€/kg)' }),
        cochinillo_estandar_min: fields.text({ label: 'Lechones · Cochinillo estándar — Mín (€/kg)' }),
        cochinillo_estandar_max: fields.text({ label: 'Lechones · Cochinillo estándar — Máx (€/kg)' }),

        // ── Porcino Ibérico ──────────────────────────────────────────
        bellota_100_min:       fields.text({ label: 'Ibérico · Bellota 100% — Mín (€/kg vivo)' }),
        bellota_100_max:       fields.text({ label: 'Ibérico · Bellota 100% — Máx (€/kg vivo)' }),
        bellota_75_min:        fields.text({ label: 'Ibérico · Bellota 75% — Mín (€/kg vivo)' }),
        bellota_75_max:        fields.text({ label: 'Ibérico · Bellota 75% — Máx (€/kg vivo)' }),
        bellota_50_min:        fields.text({ label: 'Ibérico · Bellota 50% — Mín (€/kg vivo)' }),
        bellota_50_max:        fields.text({ label: 'Ibérico · Bellota 50% — Máx (€/kg vivo)' }),
        cebo_campo_min:        fields.text({ label: 'Ibérico · Cebo de Campo — Mín (€/kg vivo)' }),
        cebo_campo_max:        fields.text({ label: 'Ibérico · Cebo de Campo — Máx (€/kg vivo)' }),
        cebo_min:              fields.text({ label: 'Ibérico · Cebo — Mín (€/kg vivo)' }),
        cebo_max:              fields.text({ label: 'Ibérico · Cebo — Máx (€/kg vivo)' }),
        lechones_ibericos_min: fields.text({ label: 'Ibérico · Lechones — Mín (€/ud)' }),
        lechones_ibericos_max: fields.text({ label: 'Ibérico · Lechones — Máx (€/ud)' }),
        primales_ibericos_min: fields.text({ label: 'Ibérico · Primales — Mín (€/kg vivo)' }),
        primales_ibericos_max: fields.text({ label: 'Ibérico · Primales — Máx (€/kg vivo)' }),

        // ── Desvieje (€/kg canal) ────────────────────────────────────
        cerdas_unica_min:   fields.text({ label: 'Desvieje · Cerdas Única — Mín (€/kg canal)' }),
        cerdas_unica_max:   fields.text({ label: 'Desvieje · Cerdas Única — Máx (€/kg canal)' }),
        cerdas_extra_min:   fields.text({ label: 'Desvieje · Cerdas Extra — Mín (€/kg canal)' }),
        cerdas_extra_max:   fields.text({ label: 'Desvieje · Cerdas Extra — Máx (€/kg canal)' }),
        cerdas_desecho_min: fields.text({ label: 'Desvieje · Cerdas Desecho — Mín (€/kg canal)' }),
        cerdas_desecho_max: fields.text({ label: 'Desvieje · Cerdas Desecho — Máx (€/kg canal)' }),
        verracos_min:       fields.text({ label: 'Desvieje · Verracos — Mín (€/kg canal)' }),
        verracos_max:       fields.text({ label: 'Desvieje · Verracos — Máx (€/kg canal)' }),
      },
    }),

    posts: collection({
      label: 'Artículos',
      slugField: 'titulo',
      path: 'src/content/posts/*',
      format: { contentField: 'contenido' },
      schema: {
        titulo: fields.slug({ name: { label: 'Título' } }),
        descripcion: fields.text({ label: 'Descripción SEO', multiline: true }),
        fecha: fields.date({ label: 'Fecha de publicación' }),
        draft: fields.checkbox({ label: 'Borrador', defaultValue: false }),
        tags: fields.array(
          fields.text({ label: 'Tag' }),
          { label: 'Tags', itemLabel: (props) => props.value }
        ),
        contenido: fields.markdoc({ label: 'Contenido', extension: 'md' }),
      },
    }),
  },

    lonjas: collection({
      label: 'Lonjas porcinas',
      slugField: 'nombre',
      path: 'src/content/lonjas/*',
      format: { contentField: 'contenido' },
      schema: {
        nombre: fields.slug({ name: { label: 'Nombre de la lonja' } }),
        descripcion: fields.text({ label: 'Descripción SEO', multiline: true }),
        grupo: fields.select({
          label: 'Grupo',
          options: [
            { label: 'A — Referencia nacional blanco y lechones', value: 'A' },
            { label: 'B — Ibérico', value: 'B' },
            { label: 'C — Lonjas catalanas', value: 'C' },
            { label: 'D — Otras lonjas', value: 'D' },
          ],
          defaultValue: 'A',
        }),
        municipio: fields.text({ label: 'Municipio' }),
        provincia: fields.text({ label: 'Provincia' }),
        comunidad: fields.text({ label: 'Comunidad autónoma' }),
        especialidad: fields.text({ label: 'Especialidad principal' }),
        orden: fields.number({ label: 'Orden (1–30)', defaultValue: 99 }),
        contenido: fields.markdoc({ label: 'Contenido', extension: 'md' }),
      },
    }),
  },

  singletons: {
    sobre: singleton({
      label: 'Sobre el sitio',
      path: 'content/sobre',
      schema: {
        descripcion: fields.text({ label: 'Descripción del sitio', multiline: true }),
        email: fields.text({ label: 'Email de contacto' }),
      },
    }),
  },
});
