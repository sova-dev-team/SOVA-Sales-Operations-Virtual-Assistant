import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { sovaApi } from "../api/sovaApi";
import { ApiError } from "../api/client";
import { Btn, Card, PageHeader } from "../components/Layout";
import type { Page } from "../types";

const customerSchema = z.object({
  contactName: z.string().trim().min(1, "Vui lòng nhập tên người liên hệ."),
  companyName: z.string().trim().min(1, "Vui lòng nhập tên công ty."),
  email: z.union([
    z.literal(""),
    z.string().trim().email("Email không đúng định dạng."),
  ]),
  phone: z.string().trim().max(40, "Số điện thoại quá dài."),
});

type CustomerForm = z.infer<typeof customerSchema>;

export default function CustomerCreatePage({
  navigate,
}: {
  navigate: (page: Page, id?: string) => void;
}) {
  const queryClient = useQueryClient();
  const form = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
    defaultValues: { contactName: "", companyName: "", email: "", phone: "" },
  });
  const mutation = useMutation({
    mutationFn: sovaApi.createCustomer,
    onSuccess: async (customer) => {
      await queryClient.invalidateQueries({ queryKey: ["customers"] });
      navigate("customer-detail", customer.id);
    },
  });

  return (
    <div className="p-6 max-w-3xl">
      <PageHeader
        title="Thêm khách hàng"
        description="Thông tin sẽ được lưu trực tiếp vào hệ thống."
      />
      <Card style={{ padding: 24 }}>
        <form
          className="grid gap-5"
          onSubmit={form.handleSubmit((values) =>
            mutation.mutate({
              contactName: values.contactName,
              companyName: values.companyName,
              email: values.email || null,
              phone: values.phone || null,
            }),
          )}
        >
          {[
            ["contactName", "Người liên hệ", "Nguyễn Văn A"],
            ["companyName", "Công ty", "Công ty TNHH ABC"],
            ["email", "Email", "contact@example.com"],
            ["phone", "Điện thoại", "0901 234 567"],
          ].map(([name, label, placeholder]) => (
            <label
              key={name}
              className="grid gap-1.5 text-sm font-medium text-gray-700"
            >
              {label}
              <input
                {...form.register(name as keyof CustomerForm)}
                placeholder={placeholder}
                className="rounded-md border border-gray-300 px-3 py-2 font-normal outline-none focus:border-indigo-600"
              />
              {form.formState.errors[name as keyof CustomerForm]?.message && (
                <span className="text-xs text-red-600">
                  {form.formState.errors[name as keyof CustomerForm]?.message}
                </span>
              )}
            </label>
          ))}
          {mutation.error && (
            <p className="text-sm text-red-600">
              {mutation.error instanceof ApiError
                ? mutation.error.message
                : "Không thể tạo khách hàng."}
            </p>
          )}
          <div className="flex gap-2">
            <Btn type="submit" disabled={mutation.isPending}>
              Lưu khách hàng
            </Btn>
            <Btn variant="secondary" onClick={() => navigate("customers")}>
              Hủy
            </Btn>
          </div>
        </form>
      </Card>
    </div>
  );
}
