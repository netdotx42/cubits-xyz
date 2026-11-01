import { requireWorkspace } from "@/lib/workspace";
import FormBuilder from "../FormBuilder";

export default async function NewFormPage() {
  await requireWorkspace();
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">New form</h1>
      <FormBuilder
        initial={{
          name: "",
          notify_email: "",
          fields: [
            { label: "Name", type: "text", required: true, optionsText: "" },
            { label: "Email", type: "email", required: true, optionsText: "" },
            { label: "Message", type: "textarea", required: false, optionsText: "" },
          ],
        }}
      />
    </div>
  );
}
