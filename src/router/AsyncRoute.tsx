import { Route, RouteProps, Redirect } from "react-router-dom";
import React from "react";

interface IcustomeAsyProps {
    checkFunc?: () => boolean;
    redirectPath?: string;
}

interface IAsyncRouteProps extends RouteProps {
    asyncComponent: () => Promise<any>;
}
export class AsyncRoute extends Route<IAsyncRouteProps & IcustomeAsyProps> {
    state = {
        component: null,
    }

    async componentDidMount() {
        const { default: component } = await this.props.asyncComponent();
        if (component == null) {
            console.error("importComponent must to be a Deault Export class in AsyncRoute component params(asyncComponent) return!");
        } else {
            this.setState({ component })
        }
    }

    render() {
        if (this.props.redirectPath && this.props.checkFunc) {
            let redirectToDefault = this.props.checkFunc();
            if (redirectToDefault) {
                return <Redirect to={{
                    pathname: this.props.redirectPath,
                    state: { from: this.props.location }
                }}></Redirect>
            }
        }
        const C = this.state.component;
        return C ? <C {...this.props} /> : null
    }
}

export const CustomeAsyncRoute = (_props: IcustomeAsyProps) => {
    return (props: IAsyncRouteProps) => {
        return <AsyncRoute {...Object.assign(_props, props)} />;
    }
}
