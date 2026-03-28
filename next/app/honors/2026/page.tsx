import HonorsYearView from '../_components/HonorsYearView';
import { awardsByYear } from '../data';

export default function Honors2026Page() {
  return <HonorsYearView year="2026" awards={awardsByYear['2026']} />;
}
