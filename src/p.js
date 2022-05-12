const p = ()=>{
	let resolve = null;
	let reject = null;
	const promise = new Promise((rslv, rjct)=>{
		resolve = rslv;
		reject = rjct;
	});
	return {resolve, reject, promise};
}

module.exports = p;