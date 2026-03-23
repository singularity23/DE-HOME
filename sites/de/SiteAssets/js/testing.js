const CONFIG = Object.freeze({
  debug: false,
  status: Object.freeze({
    IN_SERVICE: 'IN SERVICE',
    ISSUED: 'ISSUED',
    // Legacy support
    get settingStatus () {
      return {
        inService: this.IN_SERVICE,
        issued: this.ISSUED,
      };
    },
  }),
});

const myConsole = {
  silent: true,
  log (...args) {
    if (CONFIG.debug || !this.silent) {
      const timestamp = new Date().toISOString();
      console.log(`[ASPEN ${timestamp}]:`, ...args);
    }
  },

  debug (...args) {
    if (CONFIG.debug) {
      const timestamp = new Date().toISOString();
      console.log(`[ASPEN ${timestamp}]:`, ...args);
    }
  },

  table (...args) {
    if (CONFIG.debug) {
      const timestamp = new Date().toISOString();
      console.group(`[ASPEN ${timestamp}]:`);
      console.table(...args);
      console.groupEnd();
    }
  },
};

myConsole.log(CONFIG.status.settingStatus.inService);
myConsole.debug(CONFIG.status.settingStatus.issued);
myConsole.table([CONFIG.status.settingStatus.inService, CONFIG.status.settingStatus.issued]);
