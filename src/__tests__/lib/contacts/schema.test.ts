import {
  ADDRESS_TYPES,
  CONTACT_FIELDS,
  addressFieldName,
  contactInputSchema,
  formDataToValues,
  valuesToContactInput,
  zodFieldErrors,
} from "@/lib/contacts/schema";

function values(overrides: Record<string, string> = {}) {
  return {
    first_name: "Ada",
    last_name: "Lovelace",
    email: "Ada@Example.com",
    phone: "",
    company: "",
    job_title: "",
    photo_url: "",
    notes: "",
    "addresses.0.address": "",
    "addresses.0.city": "",
    "addresses.0.state": "",
    "addresses.0.postal_code": "",
    "addresses.0.country": "",
    "addresses.1.address": "",
    "addresses.1.city": "",
    "addresses.1.state": "",
    "addresses.1.postal_code": "",
    "addresses.1.country": "",
    "addresses.2.address": "",
    "addresses.2.city": "",
    "addresses.2.state": "",
    "addresses.2.postal_code": "",
    "addresses.2.country": "",
    ...overrides,
  };
}

describe("contactInputSchema", () => {
  it("lowercases the email and nulls out the blanks", () => {
    const parsed = contactInputSchema.parse(valuesToContactInput(values()));

    expect(parsed.email).toBe("ada@example.com");
    expect(parsed.phone).toBeNull();
    expect(parsed.notes).toBeNull();
    expect(parsed.addresses).toEqual([]);
  });

  it("trims what the user typed", () => {
    const parsed = contactInputSchema.parse(
      valuesToContactInput(values({ company: "  Acme  " })),
    );
    expect(parsed.company).toBe("Acme");
  });

  it("requires the three fields the API requires", () => {
    const result = contactInputSchema.safeParse(
      valuesToContactInput(values({ first_name: " ", last_name: "", email: "" })),
    );

    expect(result.success).toBe(false);
    expect(zodFieldErrors(result.error!)).toEqual({
      first_name: "First name is required",
      last_name: "Last name is required",
      email: "Email is required",
    });
  });

  it("rejects a malformed email", () => {
    const result = contactInputSchema.safeParse(
      valuesToContactInput(values({ email: "not-an-email" })),
    );
    expect(zodFieldErrors(result.error!).email).toBe("Enter a valid email address");
  });

  it("accepts HTTP(S) photo URLs and rejects other URL schemes", () => {
    expect(
      contactInputSchema.parse(
        valuesToContactInput(values({ photo_url: " https://images.example.com/ada.jpg " })),
      ).photo_url,
    ).toBe("https://images.example.com/ada.jpg");

    const result = contactInputSchema.safeParse(
      valuesToContactInput(values({ photo_url: "file:///tmp/ada.jpg" })),
    );
    expect(zodFieldErrors(result.error!).photo_url).toBe(
      "Enter a valid HTTP(S) photo URL",
    );
  });

  it("enforces the API's length limits", () => {
    const result = contactInputSchema.safeParse(
      valuesToContactInput(
        values({
          first_name: "a".repeat(101),
          "addresses.0.postal_code": "9".repeat(21),
        }),
      ),
    );

    expect(zodFieldErrors(result.error!)).toEqual({
      first_name: "First name must be 100 characters or fewer",
      "addresses.0.postal_code": "Postal code must be 20 characters or fewer",
    });
  });
});

describe("formDataToValues", () => {
  it("pulls every known field out, defaulting to an empty string", () => {
    const formData = new FormData();
    formData.set("first_name", "Grace");
    formData.set("email", "grace@example.com");
    formData.set("ignored", "nope");

    const extracted = formDataToValues(formData);

    expect(extracted.first_name).toBe("Grace");
    expect(extracted.last_name).toBe("");
    expect(Object.keys(extracted).sort()).toEqual(
      [
        ...CONTACT_FIELDS.map((field) => field.name),
        ...ADDRESS_TYPES.flatMap((_, index) =>
          ["address", "city", "state", "postal_code", "country", "type"].map((field) =>
            addressFieldName(index, field as "address" | "city" | "state" | "postal_code" | "country" | "type"),
          ),
        ),
      ].sort(),
    );
  });
});

describe("valuesToContactInput", () => {
  it("emits only address objects that have at least one populated field", () => {
    const input = valuesToContactInput(
      values({
        "addresses.0.city": "San Francisco",
        "addresses.1.country": "USA",
      }),
    );

    expect(input.addresses).toEqual([
      {
        type: "Home",
        address: null,
        city: "San Francisco",
        state: null,
        postal_code: null,
        country: null,
      },
      {
        type: "Work",
        address: null,
        city: null,
        state: null,
        postal_code: null,
        country: "USA",
      },
    ]);
  });
});


