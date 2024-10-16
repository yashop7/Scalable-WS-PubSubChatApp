import { WebSocketServer, WebSocket } from "ws";
import { createClient } from "redis";

interface Message {
  type: string;
  message: string;
  roomId: string;
}
async function main() {
  const publishClient = createClient();
  await publishClient.connect();

  const subscribeClient = createClient();
  await subscribeClient.connect();

  const wss = new WebSocketServer({ port: 8080 });
  const subscriptions: {
    [key: string]: {
      ws: WebSocket;
      rooms: string[];
    };
  } = {};

  wss.on("connection", function connection(UserSocket) {
    // UserSocket.on('error', console.error);
    const id = randomId();
    subscriptions[id] = {
      ws: UserSocket,
      rooms: [],
    };
    //IMPORTANT
    //We will also Have to add the logic when User leaves the message then we will have to clean Up the Logic

    UserSocket.on("message", function message(data) {
      const parsedMessage = JSON.parse(data as unknown as string);
      if (parsedMessage.type === "SUBSCRIBE") {
        subscriptions[id].rooms.push(parsedMessage.room);
        if (oneUserSubscribedTo(parsedMessage.room)) {
          console.log(
            "WS Server is Subscribing to the PubSub related to this Particular RoomId:",
            parsedMessage.room
          );
          subscribeClient.subscribe(parsedMessage.room, (message : string) => {
            //whenever a Message comes in this Room then we will find that USER interseted in that Room
            //and send him the message
            const parsedMessage : Message = JSON.parse(message);
            Object.keys(subscriptions).forEach((userId) => {
              const { ws, rooms } = subscriptions[userId];
              if (rooms.includes(parsedMessage.roomId)) {
                ws.send(parsedMessage.message);
              }
            });
          });
        }
      }

      if (parsedMessage.type === "UNSUBSCRIBE") {
        console.log(
          "WS Server is UnSubscribing to the PubSub related to this Particular RoomId:",
          parsedMessage.room
        );

        subscriptions[id].rooms = subscriptions[id].rooms.filter(
          (room) => room !== parsedMessage.room
        );
        if (lastPersontoLeavethis(parsedMessage.room)) {
          subscribeClient.unsubscribe(parsedMessage.room);
        }
      }

      if (parsedMessage.type === "sendMessage") {
        const message = parsedMessage.message;
        const roomId = parsedMessage.roomId;

        // Object.keys(subscriptions).forEach((userId) => {
        //     const { ws, rooms } = subscriptions[userId];
        //     if (rooms.includes(roomId)) {
        //         ws.send(message);
        //     }
        // });

        //Whever we get the message in the WS Server then we will publish that message on to the PubSUB
        publishClient.publish(
          roomId,
          JSON.stringify({
            type: "sendMessage",
            roomId,
            message,
          })
        );
      }
    });
  });
  function randomId() {
    return Math.random();
  }

  //As soon as the First User Subscribes to that ROOM , we will create Instance oneTime
  //After that soon as more users Join realated to that Particular RoomId we will not create the INstance Again
  function oneUserSubscribedTo(roomId: string) {
    let totalIntersetedPeople = 0;
    Object.keys(subscriptions).map((user) => {
      const { rooms } = subscriptions[user];
      if (rooms.includes(roomId)) {
        totalIntersetedPeople++;
      }
    });

    if (totalIntersetedPeople == 1) {
      return true;
    }

    return false;
  }
  function lastPersontoLeavethis(roomId: any) {
    let totalIntersetedPeople = 0;
    Object.keys(subscriptions).map((user) => {
      const { rooms } = subscriptions[user];
      if (rooms.includes(roomId)) {
        totalIntersetedPeople++;
      }
    });

    if (totalIntersetedPeople == 0) {
      return true;
    }

    return false;
  }
}
main();
