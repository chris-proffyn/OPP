/**
 * Layout for /play/free-training/run/:runId. Provides FreeTrainingGameProvider and nested routes.
 * Per OPP_EXTRA_TRAINING_IMPLEMENTATION_CHECKLIST §8.
 */

import { Outlet } from 'react-router-dom';
import { FreeTrainingGameProvider } from '../context/SessionGameContext';

export function FreeTrainingRunLayout() {
  return (
    <FreeTrainingGameProvider>
      <Outlet />
    </FreeTrainingGameProvider>
  );
}
