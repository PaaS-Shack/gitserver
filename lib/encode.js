var defaultPrefix = Buffer("\x02")
// details: https://www.kernel.org/pub/software/scm/git/docs/technical/protocol-capabilities.txt (side-band)
module.exports = function encode(string, prefix) {
  // \1 is an error message
  // \2 is a verbose message (default)
  //
  // protip: don't write more than 1000 bytes total per encoding
  // unless you know you are operating over sideband 64k mode

  if (!Buffer.isBuffer(string)) string = Buffer(string)
  if (prefix && !Buffer.isBuffer(prefix)) prefix = Buffer(prefix)

  var msg = Buffer.concat([prefix || defaultPrefix, string])

  var header = Buffer(2)
  header.writeUInt16BE(msg.length + 4, 0)
  var encoded = Buffer.concat([Buffer(header.toString('hex').toUpperCase()), msg])
  return encoded
}