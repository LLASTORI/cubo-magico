import { StartNode } from './StartNode';
import { MessageNode } from './MessageNode';
import { DelayNode } from './DelayNode';
import { ConditionNode } from './ConditionNode';
import { ActionNode } from './ActionNode';
import { MediaNode } from './MediaNode';
import { HttpRequestNode } from './HttpRequestNode';
import { SplitNode } from './SplitNode';
import { WaitReplyNode } from './WaitReplyNode';
import { TagNode } from './TagNode';

export const nodeTypes = {
  start: StartNode,
  message: MessageNode,
  delay: DelayNode,
  condition: ConditionNode,
  action: ActionNode,
  media: MediaNode,
  http_request: HttpRequestNode,
  split: SplitNode,
  wait_reply: WaitReplyNode,
  tag: TagNode,
};

export { 
  StartNode, 
  MessageNode, 
  DelayNode, 
  ConditionNode, 
  ActionNode, 
  MediaNode,
  HttpRequestNode,
  SplitNode,
  WaitReplyNode,
  TagNode,
};
