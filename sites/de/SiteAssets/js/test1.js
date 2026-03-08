const config = {
  sortColumnIndex: {
    SEL: 4,
    AREVA: 2,
  },
  relayTypes: {
    SEL: 'SEL',
    AREVA: 'AREVA',
  },
};

const SELDecoder = 'a';
const AREVADecoder = 'b';

const relaytype = config.relayTypes.SEL; // default to SEL; will be overridden by app.js
console.log(relaytype);
console.log(config.sortColumnIndex[relaytype]);
function _getDecoder () {
  return (
    {
      [config.relayTypes.SEL]: SELDecoder,
      [config.relayTypes.AREVA]: AREVADecoder,
    }[relaytype] || null
  );
}

a = _getDecoder();
console.log(a);
