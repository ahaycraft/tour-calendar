import TourEdit from "@/components/TourEdit";

interface PageProps {
  params: Promise<{ groupId: string }>;
}

export default async function EditPracticeBlockPage({ params }: PageProps) {
  const { groupId } = await params;
  return <TourEdit tourGroupId={groupId} expected="PRACTICE" />;
}
