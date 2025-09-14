declare const rule: {
  meta: {
    type: 'problem';
    docs: {
      description: 'disallow emoji usage, suggest Mantine icons instead';
      category: 'Best Practices';
      recommended: true;
    };
    fixable: null;
    schema: [];
    messages: {
      noEmoji: 'Avoid using emojis ({{emoji}}). Use Mantine icons instead: {{suggestion}}';
      noEmojiGeneric: 'Avoid using emojis ({{emoji}}). Use appropriate Mantine icons from @tabler/icons-react instead.';
    };
  };
  create: (context: any) => any;
};

export = rule;