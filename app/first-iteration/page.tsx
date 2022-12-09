"use client";

import { createMachine, assign } from "xstate";
import { useMachine } from "@xstate/react";
import Fuse from "fuse.js";
import { useEffect } from "react";

interface User {
  id: number;
  name: string;
}

const machine = createMachine(
  {
    context: { users: [], filterString: "" },
    tsTypes: {} as import("./page.typegen").Typegen0,
    schema: {
      context: {} as { users: User[]; filterString: string },
      events: {} as { type: "FILTER_USERS"; filterString: string },
      services: {} as { fetchData: { data: { users: User[] } } },
    },
    predictableActionArguments: true,
    id: "filterMachine",
    initial: "fetching",
    states: {
      fetching: {
        invoke: {
          src: "fetchData",
          onDone: [
            {
              target: "idle",
              actions: ["setFetchedUsers"],
            },
          ],
          onError: [
            {
              actions: ["logError"],
            },
          ],
        },
      },
      idle: {
        on: {
          FILTER_USERS: {
            actions: "setFilterString",
          },
        },
      },
    },
  },
  {
    actions: {
      setFetchedUsers: assign({
        users: (_context, event) => {
          return event.data.users;
        },
      }),
      setFilterString: assign({
        filterString: (_context, event) => {
          return event.filterString;
        },
      }),
      logError(_context, event) {
        console.error(event.data);
      },
    },
    services: {
      fetchData: async () => {
        const response = await fetch("/api/static-data");
        return await response.json();
      },
    },
  }
);

const fuse = new Fuse<User>([], { keys: ["name"] });

export default function FirstIteration() {
  const [state, send] = useMachine(machine);

  useEffect(() => {
    fuse.setCollection(state.context.users);
  }, [state.context.users]);

  const filteredUsers = fuse.search(state.context.filterString).map((user) => {
    return user.item;
  });

  return (
    <div>
      <input
        value={state.context.filterString}
        placeholder="Enter filter criteria"
        type="search"
        onChange={(event) => {
          send({ type: "FILTER_USERS", filterString: event.target.value });
        }}
      />
      {state.matches("fetching") ? (
        <div>...loading</div>
      ) : (
        (state.context.filterString === ""
          ? state.context.users
          : filteredUsers
        ).map((user) => {
          return <div key={user.id}>{user.name}</div>;
        })
      )}
    </div>
  );
}
