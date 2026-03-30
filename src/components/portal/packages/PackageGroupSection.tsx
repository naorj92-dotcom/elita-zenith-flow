import React from 'react';
import { ServiceProgramCard } from './ServiceProgramCard';

interface PackageGroupSectionProps {
  groupName: string;
  packages: any[];
  onInquire: (pkg: any) => void;
}

export function PackageGroupSection({ groupName, packages, onInquire }: PackageGroupSectionProps) {
  // Service-level descriptions
  const serviceDescriptions: Record<string, string> = {
    'Cryo Sculpt': 'Non-invasive fat reduction using controlled cooling to target and eliminate stubborn fat cells. Results develop naturally over 2–3 months as your body processes treated cells.',
    'Vacuum + RF': 'Combines vacuum suction with radiofrequency energy to tighten skin, improve texture, and reduce the appearance of cellulite. Ideal for contouring and firming.',
  };

  const description = serviceDescriptions[groupName] || `Advanced aesthetic treatment designed to help you achieve visible, lasting results.`;

  return (
    <ServiceProgramCard
      groupName={groupName}
      description={description}
      sizeVariants={packages}
      onInquire={onInquire}
    />
  );
}
