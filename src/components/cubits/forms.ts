export type FieldType = "text" | "email" | "textarea" | "select" | "phone";
export type FormField = {
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[]; // for select
};
export const FIELD_TYPES: FieldType[] = ["text", "email", "textarea", "select", "phone"];
