import EventEdit from "@/components/EventEdit";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPracticePage({ params }: PageProps) {
  const { id } = await params;
  return <EventEdit id={id} expected="PRACTICE" />;
}
