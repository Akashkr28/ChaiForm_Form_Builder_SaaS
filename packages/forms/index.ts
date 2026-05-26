import { z } from "zod";

export const fieldTypeSchema = z.enum([
  "short_text",
  "long_text",
  "email",
  "number",
  "single_select",
  "multi_select",
  "checkbox",
  "rating",
  "date",
]);

export const visibilitySchema = z.enum(["public", "unlisted"]);
export const formStatusSchema = z.enum(["draft", "published", "archived"]);

export const themeSchema = z.object({
  name: z.string().min(2),
  accent: z.string().min(3),
  background: z.string().min(3),
  surface: z.string().min(3),
  foreground: z.string().min(3),
  radius: z.number().min(0).max(24).default(8),
});

export const formFieldSchema = z.object({
  id: z.string().min(2),
  type: fieldTypeSchema,
  label: z.string().min(2).max(120),
  description: z.string().max(240).optional(),
  placeholder: z.string().max(120).optional(),
  required: z.boolean().default(false),
  options: z.array(z.string().min(1)).default([]),
  validation: z
    .object({
      minLength: z.number().int().min(0).optional(),
      maxLength: z.number().int().min(1).optional(),
      min: z.number().optional(),
      max: z.number().optional(),
      minSelected: z.number().int().min(0).optional(),
      maxSelected: z.number().int().min(1).optional(),
    })
    .default({}),
  conditional: z
    .object({
      fieldId: z.string(),
      equals: z.union([z.string(), z.number(), z.boolean()]),
    })
    .optional(),
});

export const formSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  title: z.string().min(3).max(120),
  description: z.string().min(3).max(500),
  slug: z.string().min(3).max(80).regex(/^[a-z0-9-]+$/),
  status: formStatusSchema,
  visibility: visibilitySchema,
  password: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
  responseLimit: z.number().int().min(1).optional(),
  fields: z.array(formFieldSchema).min(1),
  theme: themeSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const responseSchema = z.object({
  id: z.string(),
  formId: z.string(),
  respondentEmail: z.string().email().optional(),
  values: z.record(z.string(), z.unknown()),
  submittedAt: z.string(),
  ipHash: z.string().optional(),
});

export const createFormInputSchema = formSchema
  .pick({
    title: true,
    description: true,
    slug: true,
    visibility: true,
    fields: true,
    theme: true,
    password: true,
    expiresAt: true,
    responseLimit: true,
  })
  .extend({ status: formStatusSchema.default("draft") });

export const submitResponseInputSchema = z.object({
  slug: z.string().min(3),
  password: z.string().optional(),
  respondentEmail: z.string().email().optional(),
  values: z.record(z.string(), z.unknown()),
  honeypot: z.string().max(0).optional().default(""),
});

export type FieldType = z.infer<typeof fieldTypeSchema>;
export type Theme = z.infer<typeof themeSchema>;
export type FormField = z.infer<typeof formFieldSchema>;
export type FormRecord = z.infer<typeof formSchema>;
export type FormResponse = z.infer<typeof responseSchema>;

export function buildResponseValidator(fields: FormField[]) {
  const shape: Record<string, z.ZodType> = {};

  for (const field of fields) {
    let validator: z.ZodType;
    switch (field.type) {
      case "email":
        validator = z.string().email();
        break;
      case "number":
      case "rating":
        validator = z.coerce.number();
        if (typeof field.validation.min === "number") validator = (validator as z.ZodNumber).min(field.validation.min);
        if (typeof field.validation.max === "number") validator = (validator as z.ZodNumber).max(field.validation.max);
        break;
      case "multi_select":
        validator = z.array(z.string());
        if (typeof field.validation.minSelected === "number") validator = (validator as z.ZodArray<z.ZodString>).min(field.validation.minSelected);
        if (typeof field.validation.maxSelected === "number") validator = (validator as z.ZodArray<z.ZodString>).max(field.validation.maxSelected);
        break;
      case "single_select":
        validator = field.required ? z.string().min(1, "Please select an option.") : z.string();
        break;
      case "checkbox":
        validator = z.boolean();
        break;
      default:
        validator = z.string();
        if (typeof field.validation.minLength === "number") validator = (validator as z.ZodString).min(field.validation.minLength);
        if (typeof field.validation.maxLength === "number") validator = (validator as z.ZodString).max(field.validation.maxLength);
        break;
    }

    shape[field.id] = field.required ? validator : validator.optional().or(z.literal(""));
  }

  return z.object(shape);
}

export const demoUser = {
  id: "9f85d8c8-4f01-4a87-8b3e-7e6d7c0a1111",
  fullName: "Akash Singh",
  email: "demo@chaiforms.dev",
  password: "chaiforms123",
};

const now = new Date("2026-05-23T10:00:00.000Z").toISOString();

export const sampleForms: FormRecord[] = [
  {
    id: "form-startup-sprint",
    ownerId: demoUser.id,
    title: "Startup Sprint Application",
    description: "A high-signal application form for founders joining a weekend build sprint.",
    slug: "startup-sprint-2026",
    status: "published",
    visibility: "public",
    responseLimit: 250,
    fields: [
      { id: "name", type: "short_text", label: "Founder name", required: true, options: [], validation: { minLength: 2 } },
      { id: "email", type: "email", label: "Work email", required: true, options: [], validation: {} },
      { id: "idea", type: "long_text", label: "What are you building?", required: true, options: [], validation: { minLength: 20, maxLength: 500 } },
      { id: "stage", type: "single_select", label: "Current stage", required: true, options: ["Idea", "Prototype", "Revenue", "Scaling"], validation: {} },
      { id: "team", type: "number", label: "Team size", required: false, options: [], validation: { min: 1, max: 20 } },
    ],
    theme: { name: "YC Neon", accent: "#ff5a1f", background: "#fff7ed", surface: "#ffffff", foreground: "#191614", radius: 8 },
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "form-anime-night",
    ownerId: demoUser.id,
    title: "Anime Night RSVP",
    description: "Collect votes, snacks and attendance for a community anime screening.",
    slug: "anime-night-rsvp",
    status: "published",
    visibility: "public",
    fields: [
      { id: "handle", type: "short_text", label: "Community handle", required: true, options: [], validation: { minLength: 2 } },
      { id: "show", type: "single_select", label: "Pick the headline show", required: true, options: ["Frieren", "Jujutsu Kaisen", "Haikyu!!", "Spy x Family"], validation: {} },
      { id: "snacks", type: "multi_select", label: "Snack squad", required: false, options: ["Popcorn", "Momos", "Pocky", "Cold coffee"], validation: { maxSelected: 3 } },
      { id: "rating", type: "rating", label: "How hyped are you?", required: true, options: [], validation: { min: 1, max: 5 } },
    ],
    theme: { name: "Shonen Pop", accent: "#e11d48", background: "#fff1f2", surface: "#ffffff", foreground: "#1f1720", radius: 12 },
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "form-os-feedback",
    ownerId: demoUser.id,
    title: "Operating System Beta Feedback",
    description: "A tech-company style feedback form for a polished OS beta program.",
    slug: "os-beta-feedback",
    status: "published",
    visibility: "unlisted",
    password: "beta",
    expiresAt: "2026-12-31T23:59:59.000Z",
    fields: [
      { id: "email", type: "email", label: "Tester email", required: true, options: [], validation: {} },
      { id: "device", type: "single_select", label: "Primary device", required: true, options: ["Laptop", "Desktop", "Tablet", "VM"], validation: {} },
      { id: "issues", type: "long_text", label: "Top issue you noticed", required: true, options: [], validation: { minLength: 12 } },
      { id: "ship", type: "checkbox", label: "I would recommend shipping this beta", required: false, options: [], validation: {} },
      { id: "date", type: "date", label: "Testing date", required: false, options: [], validation: {} },
    ],
    theme: { name: "Aqua Graphite", accent: "#0ea5e9", background: "#ecfeff", surface: "#ffffff", foreground: "#0f172a", radius: 10 },
    createdAt: now,
    updatedAt: now,
  },
];

export const sampleResponses: FormResponse[] = [
  { id: "r1", formId: "form-startup-sprint", respondentEmail: "maya@launch.test", values: { name: "Maya", email: "maya@launch.test", idea: "A billing copilot for service businesses with instant quote forms.", stage: "Prototype", team: 3 }, submittedAt: "2026-05-20T09:00:00.000Z" },
  { id: "r2", formId: "form-startup-sprint", respondentEmail: "dev@orbit.test", values: { name: "Dev", email: "dev@orbit.test", idea: "A compliance checklist generator for early fintech teams.", stage: "Revenue", team: 5 }, submittedAt: "2026-05-21T12:30:00.000Z" },
  { id: "r3", formId: "form-anime-night", values: { handle: "hinata_10", show: "Haikyu!!", snacks: ["Popcorn", "Cold coffee"], rating: 5 }, submittedAt: "2026-05-22T18:10:00.000Z" },
  { id: "r4", formId: "form-anime-night", values: { handle: "frierenfan", show: "Frieren", snacks: ["Pocky"], rating: 4 }, submittedAt: "2026-05-22T18:20:00.000Z" },
  { id: "r5", formId: "form-os-feedback", respondentEmail: "tester@beta.test", values: { email: "tester@beta.test", device: "Laptop", issues: "Window snapping gets confused after waking from sleep.", ship: false, date: "2026-05-23" }, submittedAt: "2026-05-23T08:00:00.000Z" },
];

export function summarizeForm(form: FormRecord, responses: FormResponse[]) {
  const formResponses = responses.filter((response) => response.formId === form.id);
  return {
    formId: form.id,
    views: formResponses.length * 37 + (form.visibility === "public" ? 340 : 72),
    responses: formResponses.length,
    completionRate: formResponses.length > 0 ? Math.min(94, 62 + formResponses.length * 8) : 0,
    lastSubmissionAt: formResponses.at(-1)?.submittedAt,
  };
}
