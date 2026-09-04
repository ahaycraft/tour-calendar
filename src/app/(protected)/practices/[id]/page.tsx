import EventDetail from "@/components/EventDetail";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PracticeDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <EventDetail id={id} expected="PRACTICE" />;
}
