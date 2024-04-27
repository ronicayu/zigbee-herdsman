"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Queue {
    jobs;
    concurrent;
    constructor(concurrent = 1) {
        this.jobs = [];
        this.concurrent = concurrent;
    }
    async execute(func, key = null) {
        const job = { key, running: false, start: null };
        // Minor optimization/workaround: various tests like the idea that a job that is
        // immediately runnable is run without an event loop spin. This also helps with stack
        // traces in some cases, so avoid an `await` if we can help it.
        this.jobs.push(job);
        if (this.getNext() !== job) {
            await new Promise((resolve) => {
                job.start = () => {
                    job.running = true;
                    resolve(null);
                };
                this.executeNext();
            });
        }
        else {
            job.running = true;
        }
        try {
            return await func();
        }
        finally {
            this.jobs.splice(this.jobs.indexOf(job), 1);
            this.executeNext();
        }
    }
    executeNext() {
        const job = this.getNext();
        if (job) {
            job.start();
        }
    }
    getNext() {
        if (this.jobs.filter((j) => j.running).length > (this.concurrent - 1)) {
            return null;
        }
        for (let i = 0; i < this.jobs.length; i++) {
            const job = this.jobs[i];
            if (!job.running && (!job.key || !this.jobs.find((j) => j.key === job.key && j.running))) {
                return job;
            }
        }
        return null;
    }
    clear() {
        this.jobs = [];
    }
    count() {
        return this.jobs.length;
    }
}
exports.default = Queue;
//# sourceMappingURL=queue.js.map