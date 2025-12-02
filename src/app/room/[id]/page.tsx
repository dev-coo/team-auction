export default function AuctionRoomPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl font-bold">경매 진행</h1>
      <p className="mt-4 text-gray-600">
        경매방 ID: {params.id} (준비 중)
      </p>
    </div>
  );
}
