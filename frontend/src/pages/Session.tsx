import { useParams } from "react-router-dom";

export const Session: React.FC = () => {
    const { id } = useParams();
    
    return (
        <>{id}</>
    );
}