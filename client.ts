import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoloader from '@grpc/proto-loader';
import {ProtoGrpcType} from './proto/random'
import {RandomHandlers} from './proto/randomPackage/Random';
import readline from 'readline';
import { ChatResponse } from './proto/randomPackage/ChatResponse';


const PORT = 8083
const PROTO_FILE = './proto/random.proto'

const packageDef = protoloader.loadSync(path.resolve(__dirname, PROTO_FILE))

const grpcObj = (grpc.loadPackageDefinition(packageDef) as unknown) as ProtoGrpcType

const client = new grpcObj.randomPackage.Random(
 `localhost:${PORT}`, grpc.credentials.createInsecure()
)

const deadline = new Date()
deadline.setSeconds(deadline.getSeconds() + 6)

client.waitForReady(deadline, (err) =>{
  if(err){
    console.error(err)
    return;
  }
  onClientReady()
})

function onClientReady(){
  // client.PingPong({message: 'You\'re Pingged'}, (err, result) => {
  //   if(err){
  //     console.log(err)
  //     return;
    
  //   }
  //   console.log(result)
  // })


//  const stream = client.randomNumbers({maxVal: 77})
//  stream.on("data", (chunk)=> {
//   console.log(chunk)

//  })

//  stream.on("end", () =>{
//   console.log('Streaming has ended')
//  })


// const stream = client.TodoList((err, result) => {
//   if(err){
//     console.error(err)
//   }
//   console.log(result)
// })

// stream.write({status: 'never', todo: 'Get to dads place'})
// stream.write({status: 'possibly', todo: 'finish up'})
// stream.write({status: 'going', todo: 'Get transferred'})
// stream.write({status: 'true', todo: 'Learn more'})
// stream.write({status: 'possibly', todo: 'Get down for coding'})
// stream.end()

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const username = process.argv[2]
if(!username){
  console.error('No username, cant join chat')
  process.exit()
}

const metadata =  new grpc.Metadata()
metadata.set('username', username)
const call = client.Chat(metadata)

call.write({
  message: 'register'
})

call.on("data", (chunk: ChatResponse)=> {
  console.log(`${chunk.username}  ${chunk.message}`)
})

rl.on("line", (line) => {
  if(line === "quit"){
    call.end();
    return;
  }else{
    call.write({
      message: line
    })
  }
})



}