import { describe, expect, it } from "vitest";

import { toCustomer, toUser } from "./adapters";

describe("API view adapters", () => {
  const currentUser = toUser({
    id: "4d7a955a-969b-44df-88f1-b7fd378d65ae",
    email: "staff.demo@example.test",
    fullName: "Demo Staff",
    role: "staff",
    isActive: true,
    createdAt: "2026-09-14T00:00:00Z",
    updatedAt: "2026-09-14T00:00:00Z",
  });

  it("maps nullable customer fields and the current owner safely", () => {
    const customer = toCustomer(
      {
        id: "5be40147-15d4-4e98-89cd-ed38c7658aca",
        companyName: "SOVA Demo",
        contactName: "Nguyen Van A",
        email: null,
        phone: null,
        status: "active",
        ownerId: currentUser.id,
        createdAt: "2026-09-14T00:00:00Z",
        updatedAt: "2026-09-14T00:00:00Z",
      },
      currentUser,
    );

    expect(customer).toMatchObject({
      name: "Nguyen Van A",
      company: "SOVA Demo",
      email: "",
      ownerName: "Demo Staff",
      followUpDue: false,
    });
  });
});
