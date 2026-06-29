import HonorsYearView from "../_components/HonorsYearView";
import { awardsByYear } from "../data";

export default function Honors2025Page() {
  return <HonorsYearView year="2025" awards={awardsByYear["2025"]} />;
}
