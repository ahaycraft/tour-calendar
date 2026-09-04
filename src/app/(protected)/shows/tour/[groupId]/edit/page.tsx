import TourEdit from "@/components/TourEdit";

interface PageProps {
  params: Promise<{ groupId: string }>;
}

export default async function EditTourPage({ params }: PageProps) {
  const { groupId } = await params;
  return <TourEdit tourGroupId={groupId} expected="SHOW" />;
}
