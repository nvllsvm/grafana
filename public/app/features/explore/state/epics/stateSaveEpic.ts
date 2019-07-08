import { Epic } from 'redux-observable';
import { mergeMap } from 'rxjs/operators';
import { RawTimeRange, TimeRange } from '@grafana/data';
import { isDateTime } from '@grafana/data';

import { ActionOf } from 'app/core/redux/actionCreatorFactory';
import { StoreState } from 'app/types/store';
import { ExploreUrlState, ExploreId, ExploreItemState } from 'app/types/explore';
import { clearQueryKeys, serializeStateToUrlParam } from 'app/core/utils/explore';
import { updateLocation } from 'app/core/actions/location';
import { setUrlReplacedAction, stateSaveAction } from '../actionTypes';

const toRawTimeRange = (range: TimeRange): RawTimeRange => {
  let from = range.raw.from;
  if (isDateTime(from)) {
    from = from.valueOf().toString(10);
  }

  let to = range.raw.to;
  if (isDateTime(to)) {
    to = to.valueOf().toString(10);
  }

  return {
    from,
    to,
  };
};

const urlStateFromItemState = (exploreItem: ExploreItemState): ExploreUrlState => ({
  datasource: exploreItem.datasourceInstance.name,
  queries: exploreItem.queries.map(clearQueryKeys),
  range: toRawTimeRange(exploreItem.range),
  mode: exploreItem.mode,
  ui: {
    showingGraph: exploreItem.showingGraph,
    showingLogs: true,
    showingTable: exploreItem.showingTable,
    dedupStrategy: exploreItem.dedupStrategy,
  },
  originPanel: exploreItem.originPanel,
});

export const stateSaveEpic: Epic<ActionOf<any>, ActionOf<any>, StoreState> = (action$, state$) => {
  return action$.ofType(stateSaveAction.type).pipe(
    mergeMap(() => {
      const { left, right, split } = state$.value.explore;
      const orgId = state$.value.user.orgId.toString();
      const replace = left && left.urlReplaced === false;
      const urlStates: { [index: string]: string } = { orgId };
      const leftUrlState = urlStateFromItemState(left);
      urlStates.left = serializeStateToUrlParam(leftUrlState, true);

      if (split) {
        const rightUrlState = urlStateFromItemState(right);
        urlStates.right = serializeStateToUrlParam(rightUrlState, true);
      }

      const actions: Array<ActionOf<any>> = [updateLocation({ query: urlStates, replace })];
      if (replace) {
        actions.push(setUrlReplacedAction({ exploreId: ExploreId.left }));
      }

      return actions;
    })
  );
};
