import HonorsYearView from "../_components/HonorsYearView";
import { awardsByYear } from "../data";

export default function Honors2024Page() {
  return <HonorsYearView year="2024" awards={awardsByYear["2024"]} />;
}