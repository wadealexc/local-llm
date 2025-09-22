import { Role, type ChatMsg } from "../common.js";

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

    public parent?: ChatNode;
    public children: ChatNode[] = [];

    public data: ChatMsg;

    constructor(data: ChatMsg) {
        this.data = data;
    }

    isRoot(): boolean {
        return this.parent === undefined;
    }

    hasNext(): boolean {
        return this.children.length > 0;
    }

    // getNext creates a linear history by selecting the first element in
    // this node's children array, if it exists.
    getNext(): ChatNode | undefined {
        return this.children.at(0);
    }

    // getFinal returns the final ChatNode in a linear history
    getFinal(): ChatNode {
        let cur: ChatNode = this;

        while (cur.children.length > 0) {
            cur = cur.children.at(0)
                ?? (() => { throw new Error('(never) ChatNode.getFinal out of bounds') })();
        }

        return cur;
    }

    // Select a child by moving it to children[0], making it a part of the chat's linear history
    selectChild(idx: number) {
        const curSelected = this.children.at(0)
            ?? (() => { throw new Error(`ChatNode.selectChild: 0 out of bounds (len: ${this.children.length})`) })();
        const newSelected = this.children.at(idx)
            ?? (() => { throw new Error(`ChatNode.selectChild: ${idx} out of bounds (len: ${this.children.length})`) })();

        this.children[0] = newSelected;
        this.children[idx] = curSelected;
    }

    // // Rotate children array so we select the 'next' child and switch to its linear history
    // // i.e. children: [a, b, c] => [b, c, a]
    // nextChild(): ChatMsg | undefined {
    //     const curSelected = this.children.at(0);
    //     const newSelected = this.children.at(1);

    //     if (!curSelected || !newSelected) return;
    //     // TODO finish
    // }

    // Push a new child to the front of children, selecting it as the default
    push(data: ChatMsg) {
        const child = new ChatNode(data);
        child.parent = this;

        this.children.unshift(child);
        return child;
    }

    // Starting with a reference to some child, return the entire message history
    // by traversing upwards until we find the root node, then returning the reversed list
    getMessages(): ChatMsg[] {
        const messages: ChatMsg[] = [];
        let cur: ChatNode | undefined = this;

        while (cur) {
            messages.push(cur.data);
            cur = cur.parent;
        }

        return messages.reverse();
    }
}