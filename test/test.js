const should = require('chai').should();
const Hyperswarm = require('hyperswarm');
const { EvouChannel, EvouObject } = require('../evou-core');
const p = require('../src/p.js');

describe('evou', function(){
    this.timeout(50000);
    it('can work with hyperswarm', ()=>{
        const {resolve: hasData, promise: dataPromise} = p();
        return Promise.all([(async ()=>{
            const swarm1 = new Hyperswarm()
            const swarm2 = new Hyperswarm()
            
            swarm1.on('connection', (conn, info) => {
                // swarm1 will receive server connections
                conn.write('this is a server connection')
                conn.end()
            })
            swarm2.on('connection', (conn, info) => {
                conn.on('data', data => hasData());
            })
            
            const topic = Buffer.alloc(32).fill('hello world') // A topic must be 32 bytes
            const discovery = swarm1.join(topic, { server: true, client: false })
            await discovery.flushed() // Waits for the topic to be fully announced on the DHT
            
            swarm2.join(topic, { server: false, client: true })
            await swarm2.flush() // Waits for the swarm to connect to pending peers.
            
            // After this point, both client and server should have connections
        })(), dataPromise]);
    })
    it('can make a new topic', ()=>{
        const {resolve: gotLog, promise: logPromise} = p();
        return Promise.all([(async ()=>{
            const topic = 'some-topic';
            const channel = new EvouChannel(topic, {isServer: true});
            await channel.ready;
            const clientChannel = new EvouChannel(topic, {allowMultiple: true});
            const ob = new EvouObject(topic, {});
            const request = clientChannel.bond(ob);
            await clientChannel.ready;
            await clientChannel.swarm.flush();
            request({ name: 'log' }, (data)=>{
                should.exist(data);
                should.exist(data.data);
                gotLog();
                clientChannel.close();
                channel.close();
            });
            return;
        })(), logPromise]);
    });
    
    it('can create and manage a new log', async ()=>{
        const topic = 'new-topic';
        const MyObject = EvouObject.extend({
            
        });
        const channel = new EvouChannel(topic, {isServer: true});
        await channel.ready;
        const clientChannel = new EvouChannel(topic, {allowMultiple: true});
        const ob = new MyObject(topic, {});
        const request = clientChannel.bond(ob);
        await clientChannel.ready;
        await clientChannel.swarm.flush();
        await clientChannel.send({a:'test'});
        await clientChannel.send({another:'test'});
        await clientChannel.send({aThird:'test'});
        await ob.consume(clientChannel);
        should.exist(ob.log);
        ob.log.length.should.equal(3);
        return;
    });
    
    this.afterAll(()=>{
        setTimeout(()=>{process.exit()}, 500)
    })
});
