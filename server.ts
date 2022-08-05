import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoloader from '@grpc/proto-loader';
import {ProtoGrpcType} from './proto/random'
import {RandomHandlers} from './proto/randomPackage/Random';
import { TodoResponse } from './proto/randomPackage/TodoResponse';
import { TodoRequest } from './proto/randomPackage/TodoRequest';
import { ChatRequest } from './proto/randomPackage/ChatRequest';
import { ChatResponse } from './proto/randomPackage/ChatResponse';


const PORT = 8083
const PROTO_FILE = './proto/random.proto'

const packageDef = protoloader.loadSync(path.resolve(__dirname, PROTO_FILE))

const grpcObj = (grpc.loadPackageDefinition(packageDef) as unknown) as ProtoGrpcType

const randomPackage = grpcObj.randomPackage

const main = () => {
  const server = getServer()
  server.bindAsync(`localhost:${PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if(err){
      console.log(err)
      return;

    }
    console.log('Your Server has Started on localhost port ' + PORT)
    server.start()
  })
}
const todolist: TodoResponse = {todos: [] as TodoRequest[]}
const callObjectByUsername = new Map<string, grpc.ServerDuplexStream<ChatRequest, ChatResponse>>()
function getServer(){
  const server = new grpc.Server()
  server.addService(randomPackage.Random.service, {
    //Unary Call
    PingPong: (req, res) => {
      console.log(req.request)
      res(null, {message: 'The Pong'})
    },


    //server side streaming
    RandomNumbers: (call)=> {
      const {maxVal} = call.request;
      console.log(maxVal)
      let callCount = 0;
     const id = setInterval(() => {
       callCount = ++callCount;
       call.write({num: Math.floor(Math.random() * maxVal!)})
        if(callCount >= 10){
          clearInterval(id)
          call.end();
        }
      }, 500)
    },

     //client side streaming
    TodoList: (call, callback)=> {
      call.on("data", (chunk : TodoRequest)=> {
          todolist.todos?.push(chunk)
        console.log(chunk)
      })

      call.on("end", () => {
        //send back todo to clinet 
        callback(null, todolist)
        console.log('client to stream has ended')
      })
    },

    //Bi Directional Streaming
    Chat: (call) => {

      call.on("data", (chunkReq: ChatRequest) => {

        const username = call.metadata.get('username')[0] as string
        const msg = chunkReq.message;

        console.log(chunkReq)

        for(let [user, userCall] of callObjectByUsername){
          if(username != user){
            userCall.write({
              username: username,
              message: msg
            })
          }
        }

        if(callObjectByUsername.get(username) === undefined){
          callObjectByUsername.set(username, call)
        }
      })

      call.on("end", (chunkReq: ChatRequest) => {

        const username = call.metadata.get('username')[0] as string
        callObjectByUsername.delete(username)
        console.log(`${username} is stoping chat`)
        call.write({
          username: 'Server',
          message: `See you later ${username}`
        })
        call.end()
      })
    }
    
  } as RandomHandlers)

  return server;
}

main()
