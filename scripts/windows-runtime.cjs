// Windows can deny account lookup inside a restricted process. tsx only needs
// the account name for its temporary-directory suffix; use the existing process
// environment if that metadata lookup fails. File permissions stay unchanged.
const os = require("node:os");
const userInfo = os.userInfo;
if (process.platform === "win32") {
  os.userInfo = function (options) {
    try { return userInfo.call(os, options); }
    catch (error) {
      if (error.code !== "ERR_SYSTEM_ERROR" || !process.env.USERNAME) throw error;
      return { username: process.env.USERNAME, uid: -1, gid: -1,
        homedir: process.env.USERPROFILE || os.homedir(), shell: null };
    }
  };
}
