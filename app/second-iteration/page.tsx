"use client";

import { createMachine, assign, send, EventFrom } from "xstate";
import { useMachine } from "@xstate/react";
import Fuse from "fuse.js";

interface User {
  id: number;
  name: string;
}

const machine = createMachine(
  {
    context: { users: [], filteredUsers: [], filterString: "" },
    tsTypes: {} as import("./page.typegen").Typegen0,
    schema: {
      context: {} as {
        users: User[];
        filteredUsers: User[];
        filterString: string;
      },
      events: {} as
        | { type: "FILTER_USERS"; filterString: string }
        | { type: "FILTER"; filterString: string }
        | { type: "SET_FILTERED_USERS"; users: User[] }
        | { type: "RESTORE"; users: User[] },
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
              actions: ["setFetchedUsers", "setFilteredUsers"],
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
        invoke: {
          src: "filterCallback",
          id: "filterCallback",
        },
        on: {
          FILTER_USERS: [
            {
              cond: "isFilterStringEmpty",
              actions: ["setFilterString", "filterNomenclature"],
            },
            {
              actions: ["setFilterString", "restoreNomenclature"],
            },
          ],
          SET_FILTERED_USERS: {
            actions: "setFilteredUsers",
          },
        },
      },
    },
  },
  {
    guards: {
      isFilterStringEmpty(_context, event) {
        return event.filterString.length !== 0;
      },
    },
    actions: {
      setFilterString: assign({
        filterString: (_context, event) => {
          return event.filterString;
        },
      }),
      setFetchedUsers: assign({
        users: (_context, event) => {
          return event.data.users;
        },
      }),
      setFilteredUsers: assign({
        filteredUsers: (_context, event) => {
          if (event.type === "SET_FILTERED_USERS") {
            return event.users;
          } else {
            return event.data.users;
          }
        },
      }),
      logError(context, event) {
        console.error(event.data);
      },
      filterNomenclature: send(
        (context) => {
          return {
            type: "FILTER",
            filterString: context.filterString,
          };
        },
        { to: "filterCallback" }
      ),
      restoreNomenclature: send(
        (context) => {
          return {
            type: "RESTORE",
            users: context.users,
          };
        },
        { to: "filterCallback" }
      ),
    },
    services: {
      filterCallback(context) {
        return (sendBack, onReceive) => {
          const fuse = new Fuse(context.users, {
            keys: ["name"],
          });

          onReceive((event: EventFrom<typeof machine>) => {
            switch (event.type) {
              case "FILTER":
                const filteredUsers = fuse
                  .search(event.filterString)
                  .map(({ item }) => item);

                sendBack({
                  type: "SET_FILTERED_USERS",
                  users: filteredUsers,
                });

                break;

              case "RESTORE":
                sendBack({
                  type: "SET_FILTERED_USERS",
                  users: event.users,
                });

                break;
            }
          });
        };
      },
      async fetchData() {
        const response = await fetch("/api/static-data");
        return await response.json();
      },
    },
  }
);

export default function SecondIteration() {
  const [state, send] = useMachine(machine);

  return (
    <div>
      <input
        value={state.context.filterString}
        placeholder="Enter filter criteria"
        type="search"
        onChange={(event) => {
          send({
            type: "FILTER_USERS",
            filterString: event.target.value,
          });
        }}
      />
      {state.matches("fetching") ? (
        <div>...loading</div>
      ) : (
        state.context.filteredUsers.map((user) => {
          return <div key={user.id}>{user.name}</div>;
        })
      )}
    </div>
  );
}
