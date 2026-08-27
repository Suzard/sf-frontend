"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle, Loader2 } from "lucide-react";
import Field from "@/components/ui/Field";
import Button, { buttonClasses } from "@/components/ui/Button";
import {
  addressFieldName,
  ADDRESS_TEXT_FIELDS,
  ADDRESS_TYPES,
  CONTACT_FIELD_GROUPS,
} from "@/lib/contacts/schema";
import {
  EMPTY_FORM_STATE,
  type Address,
  type Contact,
  type FormState,
} from "@/lib/contacts/types";

export type ContactFormAction = (
  state: FormState,
  formData: FormData,
) => Promise<FormState>;

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : null}
      {pending ? "Saving…" : label}
    </Button>
  );
}

/**
 * Create/edit form. The field list comes from `CONTACT_FIELD_GROUPS`, and the
 * action is a bound server action — so a submit is a plain POST that works
 * before hydration and reports errors through `useActionState`.
 */
export default function ContactForm({
  action,
  contact,
  submitLabel,
  cancelHref,
}: {
  action: ContactFormAction;
  contact?: Contact;
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction] = useActionState(action, EMPTY_FORM_STATE);

  function scalarValueFor(name: string): string {
    const fromState = state.values?.[name];
    if (fromState != null) return fromState;
    const fromContact = contact?.[name as keyof Contact];
    return typeof fromContact === "string" ? fromContact : "";
  }

  function findAddress(type: Address["type"]): Address | undefined {
    return contact?.addresses.find((address) => address.type === type);
  }

  function addressValue(index: number, type: Address["type"], field: (typeof ADDRESS_TEXT_FIELDS)[number]): string {
    const name = addressFieldName(index, field);
    const fromState = state.values?.[name];
    if (fromState != null) return fromState;
    return findAddress(type)?.[field] ?? "";
  }

  return (
    <form action={formAction} noValidate className="space-y-8">
      {state.status === "error" && state.message ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-foreground"
        >
          <AlertCircle
            className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
            strokeWidth={2}
            aria-hidden="true"
          />
          <span>{state.message}</span>
        </div>
      ) : null}

      {CONTACT_FIELD_GROUPS.map((group) => (
        <fieldset key={group.title} className="space-y-4">
          <legend className="sr-only">{group.title}</legend>

          <div className="border-b border-hairline pb-2">
            <h2 className="font-display text-sm font-semibold text-foreground">
              {group.title}
            </h2>
            <p className="text-[13px] text-muted-foreground">
              {group.description}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {group.fields.map((field) => (
              <Field
                key={field.name}
                field={field}
                defaultValue={scalarValueFor(field.name)}
                error={state.fieldErrors?.[field.name]}
              />
            ))}
          </div>
        </fieldset>
      ))}

      <fieldset className="space-y-4">
        <legend className="sr-only">Addresses</legend>

        <div className="border-b border-hairline pb-2">
          <h2 className="font-display text-sm font-semibold text-foreground">
            Addresses
          </h2>
          <p className="text-[13px] text-muted-foreground">
            Optional contact locations by type. Leave all fields blank to omit an address.
          </p>
        </div>

        <div className="space-y-4">
          {ADDRESS_TYPES.map((type, index) => (
            <div key={type} className="rounded-md border border-hairline p-3">
              <h3 className="mb-3 text-[13px] font-medium text-foreground">{type}</h3>
              <input type="hidden" name={addressFieldName(index, "type")} value={type} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  field={{
                    name: addressFieldName(index, "address"),
                    label: "Street address",
                    maxLength: 300,
                    placeholder: "1 Market St, Suite 400",
                    autoComplete: "street-address",
                    wide: true,
                  }}
                  defaultValue={addressValue(index, type, "address")}
                  error={state.fieldErrors?.[addressFieldName(index, "address")]}
                />
                <Field
                  field={{
                    name: addressFieldName(index, "city"),
                    label: "City",
                    maxLength: 120,
                    placeholder: "San Francisco",
                    autoComplete: "address-level2",
                  }}
                  defaultValue={addressValue(index, type, "city")}
                  error={state.fieldErrors?.[addressFieldName(index, "city")]}
                />
                <Field
                  field={{
                    name: addressFieldName(index, "state"),
                    label: "State / region",
                    maxLength: 120,
                    placeholder: "CA",
                    autoComplete: "address-level1",
                  }}
                  defaultValue={addressValue(index, type, "state")}
                  error={state.fieldErrors?.[addressFieldName(index, "state")]}
                />
                <Field
                  field={{
                    name: addressFieldName(index, "postal_code"),
                    label: "Postal code",
                    maxLength: 20,
                    placeholder: "94105",
                    autoComplete: "postal-code",
                  }}
                  defaultValue={addressValue(index, type, "postal_code")}
                  error={state.fieldErrors?.[addressFieldName(index, "postal_code")]}
                />
                <Field
                  field={{
                    name: addressFieldName(index, "country"),
                    label: "Country",
                    maxLength: 120,
                    placeholder: "USA",
                    autoComplete: "country-name",
                  }}
                  defaultValue={addressValue(index, type, "country")}
                  error={state.fieldErrors?.[addressFieldName(index, "country")]}
                />
              </div>
            </div>
          ))}
        </div>
      </fieldset>

      <div className="flex items-center gap-2 border-t border-hairline pt-4">
        <SubmitButton label={submitLabel} />
        <Link href={cancelHref} className={buttonClasses("secondary")}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
