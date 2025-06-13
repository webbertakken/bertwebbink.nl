import { MigrationStep } from '../types/migration'

export const MIGRATION_STEPS: MigrationStep[] = [
  {
    title: 'Prepare Migration',
    description: 'Run the migration preparation script and generate the migration data.',
    link: '/verify-migration',
  },
  {
    title: 'Verify Migration',
    description: 'Visually inspect and verify the migration data before import.',
  },
  {
    title: 'Next Step (Placeholder)',
    description: 'Continue to the next step of your migration process.',
  },
]
