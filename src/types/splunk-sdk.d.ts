declare module 'splunk-sdk' {
  interface ServiceOptions {
    host: string;
    port: number;
    username: string;
    password: string;
    scheme: string;
    version?: string;
  }

  interface SearchJob {
    track(options: any, callback: (err?: Error) => void): void;
    results(options: any, callback: (err?: Error, results?: any) => void): void;
  }

  interface SavedSearch {
    name: string;
    properties(): {
      search: string;
      description: string;
      dispatch?: {
        earliest_time?: string;
        latest_time?: string;
      };
    };
    dispatch(options: any, callback: (err?: Error, job?: SearchJob) => void): void;
  }

  interface SavedSearches {
    fetch(callback: (err?: Error, searches?: SavedSearches) => void): void;
    list(): SavedSearch[];
    item(name: string): SavedSearch | null;
  }

  interface Index {
    name: string;
    properties(): {
      totalEventCount: number;
      currentDBSizeMB: number;
      maxDataSize: string;
    };
  }

  interface Indexes {
    fetch(callback: (err?: Error, indexes?: Indexes) => void): void;
    list(): Index[];
  }

  interface ServerInfo {
    properties(): {
      version: string;
      build: string;
      serverName: string;
      licenseState: string;
      mode: string;
    };
  }

  class Service {
    constructor(options: ServiceOptions);
    login(callback: (err?: Error) => void): void;
    search(query: string, params: any, callback: (err?: Error, job?: SearchJob) => void): void;
    savedSearches(): SavedSearches;
    indexes(): Indexes;
    serverInfo(callback: (err?: Error, info?: ServerInfo) => void): void;
  }

  const splunkjs: {
    Service: typeof Service;
  };

  export = splunkjs;
}