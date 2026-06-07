import { defineCollection, z } from 'astro:content';

const posts = defineCollection({
  type: 'content',
  schema: z.object({
    titulo: z.string(),
    descripcion: z.string().optional().default(''),
    fecha: z.string().optional().default(''),
    draft: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
  }),
});

const lonjas = defineCollection({
  type: 'content',
  schema: z.object({
    nombre: z.string(),
    descripcion: z.string().optional().default(''),
    grupo: z.enum(['A', 'B', 'C', 'D']),
    municipio: z.string(),
    provincia: z.string(),
    comunidad: z.string(),
    especialidad: z.string(),
    orden: z.number().optional().default(99),
  }),
});

export const collections = { posts, lonjas };
