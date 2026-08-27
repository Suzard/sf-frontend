import { z } from "zod";
import type { AddressInput, AddressType, ContactInput } from "./types";

/**
 * Client/server-shared validation for the contact form.
 *
 * The rules mirror the API's Pydantic models (`ContactCreate` / `ContactReplace`)
 * so the user sees a mistake before a round trip — the API stays the authority,
 * and anything it rejects anyway is surfaced by `toFieldErrors` in `./api.ts`.
 */

/** Optional text: trimmed, and blank becomes `null` (the API clears the field). */
function optionalText(max: number, label: string) {
  return z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer`)
    .transform((value) => value || null)
    .nullable()
    .default(null);
}

function requiredText(max: number, label: string) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be ${max} characters or fewer`);
}

/** Optional public image URL, matching the backend's HTTP(S)-only contract. */
const optionalPhotoUrl = z
  .string()
  .trim()
  .max(2048, "Photo URL must be 2048 characters or fewer")
  .refine((value) => {
    if (!value) return true;
    try {
      return ["http:", "https:"].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  }, "Enter a valid HTTP(S) photo URL")
  .transform((value) => value || null)
  .nullable()
  .default(null);

const addressTypeSchema = z.enum(["Home", "Work", "Other"]);

const addressSchema = z.object({
  type: addressTypeSchema,
  address: optionalText(300, "Street address"),
  city: optionalText(120, "City"),
  state: optionalText(120, "State"),
  postal_code: optionalText(20, "Postal code"),
  country: optionalText(120, "Country"),
});

export const contactInputSchema = z.object({
  first_name: requiredText(100, "First name"),
  last_name: requiredText(100, "Last name"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .max(320, "Email must be 320 characters or fewer")
    .pipe(z.email("Enter a valid email address"))
    .transform((value) => value.toLowerCase()),
  phone: optionalText(40, "Phone"),
  company: optionalText(200, "Company"),
  job_title: optionalText(200, "Job title"),
  photo_url: optionalPhotoUrl,
  addresses: z.array(addressSchema).default([]),
  notes: z
    .string()
    .trim()
    .transform((value) => value || null)
    .nullable()
    .default(null),
}) satisfies z.ZodType<ContactInput, unknown>;

export type ContactFormValues = z.input<typeof contactInputSchema>;

/** Collapse a ZodError into one message per field, keyed by input name. */
export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !(key in fieldErrors)) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}

/* ------------------------------------------------------------------ */
/* Form metadata — one source of truth for the fields and their limits */
/* ------------------------------------------------------------------ */

export interface ContactFieldSpec {
  name: string;
  label: string;
  type?: "text" | "email" | "tel" | "url" | "textarea";
  required?: boolean;
  maxLength: number;
  placeholder?: string;
  autoComplete?: string;
  /** Column span inside the section grid. */
  wide?: boolean;
}

export interface ContactFieldGroup {
  title: string;
  description: string;
  fields: ContactFieldSpec[];
}

export const CONTACT_FIELD_GROUPS: ContactFieldGroup[] = [
  {
    title: "Profile photo",
    description: "Add a public image URL, or leave it blank to show initials.",
    fields: [
      {
        name: "photo_url",
        label: "Photo URL",
        type: "url",
        maxLength: 2048,
        placeholder: "https://images.example.com/ada.jpg",
        autoComplete: "photo",
        wide: true,
      },
    ],
  },
  {
    title: "Identity",
    description: "First name, last name, and email are required.",
    fields: [
      {
        name: "first_name",
        label: "First name",
        required: true,
        maxLength: 100,
        placeholder: "Ada",
        autoComplete: "given-name",
      },
      {
        name: "last_name",
        label: "Last name",
        required: true,
        maxLength: 100,
        placeholder: "Lovelace",
        autoComplete: "family-name",
      },
      {
        name: "email",
        label: "Email",
        type: "email",
        required: true,
        maxLength: 320,
        placeholder: "ada@example.com",
        autoComplete: "email",
      },
      {
        name: "phone",
        label: "Phone",
        type: "tel",
        maxLength: 40,
        placeholder: "+1-415-555-0101",
        autoComplete: "tel",
      },
    ],
  },
  {
    title: "Work",
    description: "Where they work and what they do.",
    fields: [
      {
        name: "company",
        label: "Company",
        maxLength: 200,
        placeholder: "Analytical Engines",
        autoComplete: "organization",
      },
      {
        name: "job_title",
        label: "Job title",
        maxLength: 200,
        placeholder: "Mathematician",
        autoComplete: "organization-title",
      },
    ],
  },
  {
    title: "Notes",
    description: "Anything worth remembering. No length limit.",
    fields: [
      {
        name: "notes",
        label: "Notes",
        type: "textarea",
        maxLength: 10_000,
        placeholder: "Met at the SF hackathon.",
        wide: true,
      },
    ],
  },
];

export const CONTACT_FIELDS: ContactFieldSpec[] = CONTACT_FIELD_GROUPS.flatMap(
  (group) => group.fields,
);

export const ADDRESS_TYPES: AddressType[] = ["Home", "Work", "Other"];
export const ADDRESS_TEXT_FIELDS = [
  "address",
  "city",
  "state",
  "postal_code",
  "country",
] as const;

export type AddressTextField = (typeof ADDRESS_TEXT_FIELDS)[number];

export function addressFieldName(index: number, field: AddressTextField | "type"): string {
  return `addresses.${index}.${field}`;
}

function normalizeAddress(values: Record<string, string>, index: number): AddressInput {
  const address: Partial<Record<AddressTextField, string | null>> = {};
  for (const field of ADDRESS_TEXT_FIELDS) {
    const raw = values[addressFieldName(index, field)] ?? "";
    const trimmed = raw.trim();
    address[field] = trimmed ? trimmed : null;
  }
  return {
    type: ADDRESS_TYPES[index],
    address: address.address ?? null,
    city: address.city ?? null,
    state: address.state ?? null,
    postal_code: address.postal_code ?? null,
    country: address.country ?? null,
  };
}

function hasAddressContent(address: AddressInput): boolean {
  return ADDRESS_TEXT_FIELDS.some((field) => Boolean(address[field]));
}

/** Pull the contact fields out of a submitted form, as raw strings. */
export function formDataToValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = Object.fromEntries(
    CONTACT_FIELDS.map((field) => [field.name, String(formData.get(field.name) ?? "")]),
  );

  ADDRESS_TYPES.forEach((type, index) => {
    values[addressFieldName(index, "type")] = type;
    for (const field of ADDRESS_TEXT_FIELDS) {
      values[addressFieldName(index, field)] = String(
        formData.get(addressFieldName(index, field)) ?? "",
      );
    }
  });

  return values;
}

export function valuesToContactInput(values: Record<string, string>): ContactFormValues {
  const addresses = ADDRESS_TYPES.map((_, index) => normalizeAddress(values, index)).filter(
    hasAddressContent,
  );

  return {
    first_name: values.first_name ?? "",
    last_name: values.last_name ?? "",
    email: values.email ?? "",
    phone: values.phone ?? "",
    company: values.company ?? "",
    job_title: values.job_title ?? "",
    photo_url: values.photo_url ?? "",
    notes: values.notes ?? "",
    addresses,
  };
}
