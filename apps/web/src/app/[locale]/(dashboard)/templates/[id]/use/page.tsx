"use client";

import { useParams } from "next/navigation";
import { UseTemplateWizard } from "@/features/templates/components/use-template-wizard/use-template-wizard";

export default function UseTemplatePage() {
  const params = useParams<{ id: string }>();
  return <UseTemplateWizard templateId={params.id} />;
}
