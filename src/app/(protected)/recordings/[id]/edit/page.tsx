import EventEdit from "@/components/EventEdit";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditRecordingPage({ params }: PageProps) {
  const { id } = await params;
  return <EventEdit id={id} expected="RECORDING" />;
}
