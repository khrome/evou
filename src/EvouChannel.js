let index = {};
const Hyperswarm = require('hyperswarm');
const ExtendedEmitter = require('extended-emitter');
const p = require('./p.js');

const topic = (s)=>{
    return Buffer.alloc(32).fill(s)
}

const Channel = function(identifier, opts){
    const options = opts || {};
    try{
        let swarm = (options.swarm) || new Hyperswarm();
        let isServer = options.isServer;
        let id = topic(identifier || 'EVOU_CHANNEL_'+Math.floor(Math.random()*1000000000));
        if(index[id] && !options.allowMultiple) return index[id];
        const {resolve, promise: connectionReady} = p();
        this.bonded = [];
        this.log = [];
        swarm.on('connection', (conn, info) => {
            this.connection = conn;
            if(isServer){
                if(options.user && options.user.definition){
                    /*
                    {
                        type: 'user-define',
                        key: 'not-a-real-key',
                        avatar: 'libravatar:this-is-a-hash',
                        handle: 'some-name'
                    }
                    */
                    this.log.push(options.user.definition());
                }
                conn.on('data', (s)=>{ //user requests
                    let data = JSON.parse(s);
                    if(data.request){
                        switch(data.request.toLowerCase()){
                            case 'log':
                                conn.write(JSON.stringify({ 
                                    response: 'log', 
                                    id: data.id, 
                                    data: this.log 
                                }));
                                break;
                            default: throw new Error('Unknown request type: '+data.request);
                        }
                    }else{
                        this.log.push(data);
                    }
                });
            }else{
                conn.on('data', (data)=>{
                    this.bonded.forEach((bondedObject)=>{
                        bondedObject.emit('data', JSON.parse(data));
                    });
                });
            }
            resolve();
        });
        this.discovery = swarm.join(id, {
            server: !!isServer,
            client: !isServer
        });
        let flushed = null;
        if(isServer || true){
            flushed = this.discovery.flushed();
        }else{
            flushed = swarm.flush();
        }
        this.swarm = swarm;
        this.active = Promise.all([connectionReady, flushed])
        this.ready = flushed;
        this.connectionReady = connectionReady;
        index[id] = this;
    }catch(ex){
        console.log('ERROR', ex);
    }
}

Channel.prototype.send = async function(message){
    await this.connectionReady;
    this.connection.write(JSON.stringify(message));
};

Channel.prototype.close = async function(message){
    await this.connectionReady;
    this.connection.end();
};

Channel.prototype.request = async function(ob, cb, emitter){
    let rand = ''+Math.floor(Math.random()*1000000);
    (emitter || this.connection).once('data', {
        response: ob.name,
        id: rand
    }, (ob)=>{
        cb(ob);
    });
    await this.send({ request: ob.name, id: rand });
};

Channel.prototype.bond = function(evouObject){
    if(this.bonded.indexOf(evouObject) === -1){
        this.bonded.push(evouObject);
    }
    return (ob, cb)=>{
        this.request(ob, cb, evouObject);
    }
};

module.exports = Channel;
