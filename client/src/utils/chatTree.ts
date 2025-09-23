import { Role, type ChatMsg } from "../common.js";

export type NodeInfo = {
    history: ChatMsg[];
    nextMessage: ChatMsg | undefined;

    // length of the most recent thread in the node's history
    // ... and our position in the thread. 
    // if there are no parents with children.length > 1, this is undefined
    lastThreadPosition: {
        idx: number;
        length: number;
    } | undefined;
}

export type ChatRoot = {
    topic: string;
    node: ChatNode;
}

export class ChatTree {

    public roots: ChatRoot[] = [];

    currentTopic(): string | undefined {
        return this.roots.at(0)?.topic;
    }

    getCurrentNodes(): ChatNode[] | undefined {
        const root = this.roots.at(0)?.node;
        if (!root) return undefined;

        let cur: ChatNode | undefined;
    }

    // Push a new topic to the tree and return the root ChatNode of that topic
    pushTopic(topic: string, modelName: string, hostName: string): ChatNode {
        // Create system prompt    
        const dateString = (new Date())
            .toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        const systemPrompt = `You are ${modelName}, a self-hosted language model running on ${hostName}.
Current date: ${dateString}
        
Personality:
You are a capable, thoughtful, and precise assistant. Your goal is to understand the user's intent, ask clarifying questions when needed, think step-by-step through problems, provide clear and accurate answers, and proactively anticipate helpful follow-up information. Always prioritize being truthful, nuanced, insightful, and efficient, tailoring your responses specifically to the user's needs and preferences.`;

        const newRoot: ChatRoot = {
            topic: topic,
            node: new ChatNode({
                role: Role.System,
                content: systemPrompt
            })
        };

        this.roots.push(newRoot);
        return newRoot.node;
    }
}

export class ChatNode {

    // This node's data
    public data: ChatMsg;

    // This node's parent/children
    public parent?: ChatNode;
    public selectedChild?: number;
    public children: ChatNode[] = [];

    constructor(data: ChatMsg) {
        this.data = data;
    }

    // Push a new child to the end of children, selecting it as default
    newChild(data: ChatMsg): ChatNode {
        const child = new ChatNode(data);
        child.parent = this;

        this.children.push(child);
        this.selectedChild = this.children.length - 1;

        return child;
    }

    // Change the active thread by incrementing going back to the last thread and incrementing
    // its selection idx by 1
    // - if there is no thread in our ancestors, this returns undefined
    // - if incrementing causes a selection index to exceed the length of a node's children, the
    //   index wraps back around to 0
    //
    // If successful, returns the top of the thread
    selectNextThread(): ChatNode | undefined {
        const lastThread = this.#findParentOfLastThread();
        if (!lastThread) return;
        if (lastThread.selectedChild === undefined) throw new Error('(never) selectNextThread: no child');

        let newSelection = lastThread.selectedChild + 1;
        if (newSelection >= lastThread.children.length) {
            newSelection = 0;
        }

        lastThread.selectedChild = newSelection;

        let bottom = lastThread.getSelectedChild();
        while (bottom?.getSelectedChild()) {
            bottom = bottom.getSelectedChild();
        }

        return bottom;
    }

    // Change the selected child by decrementing the selection idx by 1 and
    // wrapping around to length - 1 if needed
    selectPrevThread(): ChatNode | undefined {
        const lastThread = this.#findParentOfLastThread();
        if (!lastThread) return;
        if (lastThread.selectedChild === undefined) throw new Error('(never) selectNextThread: no child');

        let newSelection = lastThread.selectedChild - 1;
        if (newSelection < 0) {
            newSelection = lastThread.children.length - 1;
        }

        lastThread.selectedChild = newSelection;

        let bottom = lastThread.getSelectedChild();
        while (bottom?.getSelectedChild()) {
            bottom = bottom.getSelectedChild();
        }

        return bottom;
    }

    // getSelectedChild creates a linear history by returning the selected child
    getSelectedChild(): ChatNode | undefined {
        if (this.selectedChild === undefined) return;

        return this.children.at(this.selectedChild)
            ?? (() => { throw new Error('(never) ChatNode.getSelectedChild got undefined') })();
    }

    getNodeInfo(): NodeInfo {
        const lastThread: ChatNode | undefined = this.#findParentOfLastThread();
        let lastThreadPosition: {
            idx: number,
            length: number
        } | undefined = undefined;

        if (lastThread) {
            if (lastThread.selectedChild === undefined) throw new Error('(never) getNodeInfo: no selected child');

            lastThreadPosition = {
                idx: lastThread.selectedChild,
                length: lastThread.children.length
            };
        }

        return {
            history: this.#getMessageHistory(),
            nextMessage: this.getSelectedChild()?.data,
            lastThreadPosition: lastThreadPosition,
        };
    }

    #findParentOfLastThread(): ChatNode | undefined {
        let cur: ChatNode | undefined = this;

        // iterate as long as cur still exists
        while (cur) {
            // if we have siblings, we're at the thread root's nextMessage
            let foundThread = cur.children.length > 1;
            if (foundThread) {
                return cur;
            }

            cur = cur.parent;
        }

        return undefined;
    }

    // Starting with a reference to some child, return the entire message history
    // by traversing upwards until we find the root node, then returning the reversed list
    #getMessageHistory(): ChatMsg[] {
        const messages: ChatMsg[] = [];
        let cur: ChatNode | undefined = this;

        while (cur) {
            messages.push(cur.data);
            cur = cur.parent;
        }

        return messages.reverse();
    }
}