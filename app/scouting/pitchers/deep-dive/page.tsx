import dynamic from "next/dynamic";

const PitchersDeepDiveSearch = dynamic(
  () => import("@/components/deep-dive/PitchersDeepDiveSearch"),
  { ssr: false }
);

export default function Page() {
  return <PitchersDeepDiveSearch />;
}
