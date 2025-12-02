export default function JoinPage({ params }: { params: { code: string } }) {
  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl font-bold">경매 입장</h1>
      <p className="mt-4 text-gray-600">
        초대 코드: {params.code} (준비 중)
      </p>
    </div>
  );
}
