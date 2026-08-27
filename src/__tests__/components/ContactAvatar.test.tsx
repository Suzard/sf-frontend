import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import ContactAvatar from "@/components/contacts/ContactAvatar";
import { makeContact } from "../mocks/handlers";

describe("ContactAvatar", () => {
  it("shows initials when a contact has no photo", () => {
    render(<ContactAvatar contact={makeContact()} />);

    expect(screen.getByText("AL")).toBeInTheDocument();
    expect(screen.queryByRole("img", { hidden: true })).toBeNull();
  });

  it("shows a circular profile photo when one is present", () => {
    const photoUrl = "https://images.example.com/ada.jpg";
    const { container } = render(
      <ContactAvatar contact={makeContact({ photo_url: photoUrl })} size="lg" />,
    );

    const image = container.querySelector("img");
    expect(image).toHaveAttribute("src", photoUrl);
    expect(image).toHaveClass("object-cover");
  });

  it("falls back to initials when the image cannot load", () => {
    const { container } = render(
      <ContactAvatar
        contact={makeContact({ photo_url: "https://images.example.com/missing.jpg" })}
      />,
    );

    fireEvent.error(container.querySelector("img")!);

    expect(screen.getByText("AL")).toBeInTheDocument();
    expect(screen.queryByRole("img", { hidden: true })).toBeNull();
  });
});
