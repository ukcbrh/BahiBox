import fs from 'fs';
let content = fs.readFileSync('src/components/services/StaffTeamView.tsx', 'utf-8');

const importStr = "import { RiderJobsView } from './RiderJobsView';\n";
if (!content.includes('RiderJobsView')) {
  const lastImportIndex = content.lastIndexOf('import ');
  const insertIndex = content.indexOf('\n', lastImportIndex) + 1;
  content = content.slice(0, insertIndex) + importStr + content.slice(insertIndex);
}

const riderJobsTarget = `{GOOGLE_MAPS_API_KEY && (serviceMode === 'business' || (serviceMode === 'individual' && myProfile?.provider_type?.toLowerCase() === 'rider' && myProfile)) ? (`;

const riderJobsNew = `{serviceMode === 'individual' && myProfile?.provider_type?.toLowerCase() === 'rider' && (
  <RiderJobsView riderId={myProfile.id} />
)}
{GOOGLE_MAPS_API_KEY && (serviceMode === 'business' || (serviceMode === 'individual' && myProfile?.provider_type?.toLowerCase() === 'rider' && myProfile)) ? (`;

if (content.includes(riderJobsTarget) && !content.includes('<RiderJobsView')) {
  content = content.replace(riderJobsTarget, riderJobsNew);
  console.log('Added RiderJobsView');
} else {
  console.log('RiderJobsView already added or target not found');
}

fs.writeFileSync('src/components/services/StaffTeamView.tsx', content);
