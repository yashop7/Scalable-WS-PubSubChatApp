import { WebSocketServer , WebSocket } from 'ws';
import {createClient} from "redis";

async function main() {

const publishClient = createClient();
await publishClient.connect();

const subscribeClient = createClient();
await subscribeClient.connect();

const wss = new WebSocketServer({ port: 8080 });
const subscriptions : {[key : string] : {
    ws : WebSocket,
    rooms : string[]
}} = {
}

wss.on('connection', function connection(UserSocket) {
    // UserSocket.on('error', console.error);
    const id = randomId();
    subscriptions[id] = {
        ws: UserSocket,
        rooms: []
    }

    UserSocket.on('message', function message(data) {
        const parsedMessage = JSON.parse(data as unknown as string);
        if (parsedMessage.type === "SUBSCRIBE") {
            subscriptions[id].rooms.push(parsedMessage.room);
        }
    
        if (parsedMessage.type === "UNSUBSCRIBE") {
            subscriptions[id].rooms = subscriptions[id].rooms.filter((room) => room !== parsedMessage.room);
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
            publishClient.publish(roomId , JSON.stringify({
                type : "sendMessage",
                roomId ,
                message
            }))
        }
    });
    

});
function randomId() {
    return Math.random();
}
}
main();