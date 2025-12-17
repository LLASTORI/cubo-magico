import { StartNode } from './StartNode';
import { MessageNode } from './MessageNode';
import { DelayNode } from './DelayNode';
import { ConditionNode } from './ConditionNode';
import { ActionNode } from './ActionNode';
import { MediaNode } from './MediaNode';

export const nodeTypes = {
  start: StartNode,
  message: MessageNode,
  delay: DelayNode,
  condition: ConditionNode,
  action: ActionNode,
  media: MediaNode,
};

export { StartNode, MessageNode, DelayNode, ConditionNode, ActionNode, MediaNode };
