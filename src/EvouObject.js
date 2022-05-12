const access = require('object-accessor');
const Emitter = require('extended-emitter');
const extendClass = require('extend-interface');
const EvouChannel = require('./EvouChannel');
const sync = require('kitchen-sync');

let EvouObject = function(channelId, defaultValues){
    this.id = channelId;
    this.channel = new EvouChannel(this.id);
    (new Emitter()).onto(this);
    this.channel.bond(this);
    this.log = [];
    var dataContext = defaultValues || {};
    access.augment(this, dataContext);
}

EvouObject.prototype.process = function(eventObject){
    // console.log(eventObject);
};
EvouObject.prototype.valid = function(eventObject){
    return true;
};
EvouObject.prototype.transform = function(eventObject){
    return eventObject;
};
EvouObject.prototype.consume = function(channel, cb){ //reconstitute this state's channel
    const callback = sync(cb);
    channel.request({name:'log'}, (data)=>{
        this.log = data.data.map(this.transform);
        this.log.forEach((item)=>{
            this.process(item);
        });
        callback(null, data);
    }, this);
    return callback.return;
};

EvouObject.extend = function(cls, cns){
    var cons = cns || function(){
        EvouObject.apply(this, arguments);
        return this;
    };
    return extendClass(cls, cons, EvouObject);
};

module.exports = EvouObject;
