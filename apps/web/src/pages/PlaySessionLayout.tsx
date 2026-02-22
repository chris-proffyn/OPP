/**
 * Layout for /play/session/:calendarId. Renders nested routes: index = session view, step = RoutineStepPage.
 * Per OPP_ROUTINE_PAGE_IMPLEMENTATION_CHECKLIST §2, §8: shared game state in context.
 */

import { Outlet } from 'react-router-dom';
import { SessionGameProvider } from '../context/SessionGameContext';

export function PlaySessionLayout() {
  return (
    <SessionGameProvider>
      <Outlet />
    </SessionGameProvider>
  );
}
