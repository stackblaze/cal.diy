"use client";

import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function PublicRoutingFormPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number(params?.id);
  const { data: form } = trpc.viewer.routingForms.getPublic.useQuery({ id }, { enabled: !!id });
  const submit = trpc.viewer.routingForms.submit.useMutation({
    onSuccess: (result) => {
      if (result.redirectUrl) {
        router.push(result.redirectUrl);
      }
    },
  });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  if (!form) return <p className="p-8">Loading…</p>;
  const fields = (form.fields as { name: string; type: string }[]) || [];
  return (
    <main className="mx-auto max-w-lg space-y-4 px-4 py-12">
      <h1 className="text-2xl font-semibold">{form.name}</h1>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit.mutate({ formId: form.id, answers });
        }}>
        {fields.map((field) => (
          <label key={field.name} className="block text-sm">
            {field.name}
            <input
              className="border-subtle bg-default mt-1 w-full rounded-md border px-3 py-2"
              value={answers[field.name] || ""}
              onChange={(e) => setAnswers((current) => ({ ...current, [field.name]: e.target.value }))}
            />
          </label>
        ))}
        <Button type="submit">Continue</Button>
      </form>
    </main>
  );
}
