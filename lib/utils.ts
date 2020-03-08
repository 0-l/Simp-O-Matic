import { inspect } from 'util';
import deep_clone from 'deepcopy';
import './extensions';

export const type: (obj: any) => string = (global => obj =>
    (obj === global)
        ? 'global'
        : ({})
            .toString.call(obj)
            .match(/\s([a-z|A-Z]+)/)[1]
            .toLowerCase())(this);

export const pp = o => inspect(o, {
    colors: true,
    showHidden: false,
    depth: 50
});

export const deep_merge_pair = (target, source) => {
    Object.keys(source).forEach(key => {
        const target_value = target[key];
        const source_value = source[key];

        if (Array.isArray(target_value)
         && Array.isArray(source_value)) {
            target[key] = target_value.concat(...source_value);
        }
        else if (type(target_value) === 'object'
              && type(source_value) === 'object') {
            target[key] = deep_merge_pair(target_value, source_value);
        }
        else {
            target[key] = source_value;
        }
    });

    return target;
}

export const deep_merge = (...objects) =>
    (objects.length === 2)
        ? deep_merge_pair(objects[0], objects[1])
        : deep_merge_pair(objects[0], deep_merge(objects.slice(1)));


export const parse_regex = (s : string) => {
    let temp = s.split('/');
    const options = temp.pop();
    temp.shift();
    const contents = temp.join('/');
    return new RegExp(contents, options);
};

export const compile_match = obj => {
    const o = deep_clone(obj);
    if (type(o.match) === 'string') {
        o.match = parse_regex(o.match);
    }
    return o;
};

const recursive_regex_to_string = o => {
    if (type(o) === 'regexp') {
        return o.toString();
    }
    if (type(o) === 'object' || type(o) === 'array') {
        for (const key in o) {
            o[key] = recursive_regex_to_string(o[key]);
        }
        return o;
    }
    return o;
}

export const export_config = (obj, { ugly = false }) => {
    const o = recursive_regex_to_string(deep_clone(obj));
    // Make sure all rules are unique,
    //  i.e. eliminate duplicate rules.
    ['respond', 'reject', 'replace']
        .forEach(name => o.rules[name] = o.rules[name]
            .map(JSON.stringify)
            .unique()
            .map(JSON.parse));

    return JSON.stringify(o, null, ugly ? null : 4);
};